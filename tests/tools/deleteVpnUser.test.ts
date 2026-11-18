import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { OmadaClient } from '../../src/omadaClient/index.js';
import { OmadaApiError } from '../../src/omadaClient/request.js';
import { registerDeleteVpnUserTool } from '../../src/tools/deleteVpnUser.js';

type Handler = (
    args: Record<string, unknown>,
    extra: object
) => Promise<{ structuredContent?: Record<string, unknown>; content: { text: string }[] }>;

describe('tools/deleteVpnUser', () => {
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
        registerDeleteVpnUserTool(server, client as unknown as OmadaClient);
    });

    it('validates the id', () => {
        expect(() => definition.inputSchema.userId.parse('')).toThrow();
    });

    it('previews the record without deleting', async () => {
        const result = await handler({ userId: 'u-1' }, {});
        expect(client.deleteVpnUser).not.toHaveBeenCalled();
        expect(result.structuredContent).toMatchObject({ status: 'planned', result: { id: 'u-1' } });
    });

    it('deletes once and verifies it is gone', async () => {
        const result = await handler({ userId: 'u-1', siteId: 'site-1', dryRun: false }, {});
        expect(client.deleteVpnUser).toHaveBeenCalledWith('u-1', 'site-1', undefined);
        expect(result.structuredContent).toMatchObject({ status: 'verified' });
    });

    it('refuses unknown ids', async () => {
        await expect(handler({ userId: 'missing', dryRun: false }, {})).rejects.toThrow('No VPN user with id "missing"');
    });

    it('keeps the stored password out of the preview', async () => {
        const result = await handler({ userId: 'u-1' }, {});
        expect(JSON.stringify(result.structuredContent)).not.toContain('old-secret');
    });

    it('surfaces controller rejections', async () => {
        client.deleteVpnUser.mockRejectedValueOnce(new OmadaApiError(-1001, 'rejected'));
        await expect(handler({ userId: 'u-1', dryRun: false }, {})).rejects.toThrow('(errorCode -1001): rejected');
    });
});
