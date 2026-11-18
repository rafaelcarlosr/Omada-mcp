import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { OmadaClient } from '../../src/omadaClient/index.js';
import { OmadaApiError } from '../../src/omadaClient/request.js';
import { registerUpdateVpnUserTool } from '../../src/tools/updateVpnUser.js';

type Handler = (
    args: Record<string, unknown>,
    extra: object
) => Promise<{ structuredContent?: Record<string, unknown>; content: { text: string }[] }>;

const payload = { username: 'bob', password: 'N3w!pass', protocol: 1, maxConnections: 2 };

describe('tools/updateVpnUser', () => {
    let handler: Handler;
    let definition: { inputSchema: Record<string, { parse: (value: unknown) => unknown }> };
    let client: Record<string, ReturnType<typeof vi.fn>>;
    let rows: Record<string, unknown>[];

    beforeEach(() => {
        rows = [{ id: 'u-1', username: 'bob', password: 'old-secret', protocol: 1, maxConnections: 1 }];
        client = {
            listVpnUsers: vi.fn(async () => rows),
            createVpnUser: vi.fn((body: Record<string, unknown>) => {
                rows = [...rows, { ...body, id: 'new-1' }];
                return Promise.resolve({});
            }),
            updateVpnUser: vi.fn((id: string, body: Record<string, unknown>) => {
                rows = rows.map((row) => (row.id === id ? { ...row, ...body } : row));
                return Promise.resolve({});
            }),
            deleteVpnUser: vi.fn((id: string) => {
                rows = rows.filter((row) => row.id !== id);
                return Promise.resolve({});
            }),
        };
        const server = {
            registerTool: vi.fn((_name, def, fn) => {
                definition = def;
                handler = fn;
            }),
        } as unknown as McpServer;
        registerUpdateVpnUserTool(server, client as unknown as OmadaClient);
    });

    it('validates the id and payload', () => {
        expect(() => definition.inputSchema.userId.parse('')).toThrow();
        expect(() => definition.inputSchema.payload.parse({ ...payload, unexpected: true })).toThrow();
    });

    it('previews by default without writing', async () => {
        const result = await handler({ userId: 'u-1', payload }, {});
        expect(client.updateVpnUser).not.toHaveBeenCalled();
        expect(result.structuredContent).toMatchObject({ status: 'planned', result: { dryRun: true, id: 'u-1' } });
    });

    it('updates once and verifies the readback', async () => {
        const result = await handler({ userId: 'u-1', payload, siteId: 'site-1', dryRun: false }, {});
        expect(client.updateVpnUser).toHaveBeenCalledWith('u-1', payload, 'site-1', undefined);
        expect(result.structuredContent).toMatchObject({ status: 'verified' });
    });

    it('refuses unknown ids', async () => {
        await expect(handler({ userId: 'missing', payload, dryRun: false }, {})).rejects.toThrow('No VPN user with id "missing"');
    });

    it('never returns a password', async () => {
        const result = await handler({ userId: 'u-1', payload, dryRun: false }, {});
        expect(JSON.stringify(result)).not.toContain('N3w!pass');
        expect(JSON.stringify(result)).not.toContain('old-secret');
    });

    it('surfaces controller rejections', async () => {
        client.updateVpnUser.mockRejectedValueOnce(new OmadaApiError(-1001, 'rejected'));
        await expect(handler({ userId: 'u-1', payload, dryRun: false }, {})).rejects.toThrow('(errorCode -1001): rejected');
    });
});
