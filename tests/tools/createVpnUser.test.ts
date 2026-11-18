import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { OmadaClient } from '../../src/omadaClient/index.js';
import { OmadaApiError } from '../../src/omadaClient/request.js';
import { registerCreateVpnUserTool } from '../../src/tools/createVpnUser.js';

type Handler = (
    args: Record<string, unknown>,
    extra: object
) => Promise<{ structuredContent?: Record<string, unknown>; content: { text: string }[] }>;

const payload = { username: 'alice', password: 'S3cret!pass', protocol: 0, clientMode: 0, maxConnections: 1 };

describe('tools/createVpnUser', () => {
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
        registerCreateVpnUserTool(server, client as unknown as OmadaClient);
    });

    it('validates the documented payload', () => {
        expect(() => definition.inputSchema.payload.parse({ ...payload, unexpected: true })).toThrow();
        expect(definition.inputSchema.payload.parse(payload)).toEqual(payload);
    });

    it('previews by default without writing', async () => {
        const result = await handler({ payload }, {});
        expect(client.createVpnUser).not.toHaveBeenCalled();
        expect(result.structuredContent).toMatchObject({ status: 'planned', result: { dryRun: true } });
    });

    it('creates once and verifies the readback', async () => {
        const result = await handler({ payload, siteId: 'site-1', dryRun: false }, {});
        expect(client.createVpnUser).toHaveBeenCalledTimes(1);
        expect(client.createVpnUser).toHaveBeenCalledWith(payload, 'site-1', undefined);
        expect(result.structuredContent).toMatchObject({ status: 'verified', result: { createdId: 'new-1' } });
    });

    it('refuses a duplicate username', async () => {
        await expect(
            handler({ payload: { username: 'bob', password: 'S3cret!pass', protocol: 0, clientMode: 0, maxConnections: 1 }, dryRun: false }, {})
        ).rejects.toThrow('already exists');
        expect(client.createVpnUser).not.toHaveBeenCalled();
    });

    it('never returns a password', async () => {
        const result = await handler({ payload, dryRun: false }, {});
        expect(JSON.stringify(result)).not.toContain('S3cret!pass');
        expect(JSON.stringify(result)).not.toContain('old-secret');
    });

    it('surfaces controller rejections', async () => {
        client.createVpnUser.mockRejectedValueOnce(new OmadaApiError(-1001, 'rejected'));
        await expect(handler({ payload, dryRun: false }, {})).rejects.toThrow('(errorCode -1001): rejected');
    });
});
