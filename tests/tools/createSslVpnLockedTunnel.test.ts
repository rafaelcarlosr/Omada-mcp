import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { OmadaClient } from '../../src/omadaClient/index.js';
import { OmadaApiError } from '../../src/omadaClient/request.js';
import { registerCreateSslVpnLockedTunnelTool } from '../../src/tools/createSslVpnLockedTunnel.js';

type Handler = (
    args: Record<string, unknown>,
    extra: object
) => Promise<{ structuredContent?: Record<string, unknown>; content: { text: string }[] }>;

describe('tools/createSslVpnLockedTunnel', () => {
    let handler: Handler;
    let definition: { inputSchema: Record<string, { parse: (value: unknown) => unknown }> };
    let client: Record<string, ReturnType<typeof vi.fn>>;
    let locks: Record<string, unknown>[];

    beforeEach(() => {
        locks = [
            { id: 'l1', type: 1, ip: '10.0.0.5', totalLockTime: 600, leftLockTime: 590 },
            { id: 'l2', type: 0, username: 'bob', totalLockTime: 30, leftLockTime: 20 },
        ];
        client = {
            listSslVpnLockedTunnels: vi.fn(async () => locks),
            createSslVpnLockedTunnel: vi.fn((body: Record<string, unknown>) => {
                locks = [...locks, { id: 'l3', ...body, leftLockTime: body.totalLockTime }];
                return Promise.resolve(undefined);
            }),
            updateSslVpnLockedTunnel: vi.fn((id: string, body: Record<string, unknown>) => {
                locks = locks.map((lock) => (lock.id === id ? { ...lock, ...body } : lock));
                return Promise.resolve(undefined);
            }),
            deleteSslVpnLockedTunnel: vi.fn((id: string) => {
                locks = locks.filter((lock) => lock.id !== id);
                return Promise.resolve(undefined);
            }),
            deleteSslVpnLockedTunnels: vi.fn((ids: string[]) => {
                locks = locks.filter((lock) => !ids.includes(String(lock.id)));
                return Promise.resolve(undefined);
            }),
        };
        const server = {
            registerTool: vi.fn((_name, def, fn) => {
                definition = def;
                handler = fn;
            }),
        } as unknown as McpServer;
        registerCreateSslVpnLockedTunnelTool(server, client as unknown as OmadaClient);
    });

    it('previews, then locks an IP and verifies', async () => {
        const payload = { type: 1, ip: '10.0.0.6', totalLockTime: 30 };
        expect((await handler({ payload }, {})).structuredContent).toMatchObject({ status: 'planned' });
        const result = await handler({ payload, dryRun: false }, {});
        expect(client.createSslVpnLockedTunnel).toHaveBeenCalledWith(payload, undefined, undefined);
        expect(result.structuredContent).toMatchObject({ status: 'verified', result: { createdId: 'l3' } });
    });

    it('refuses locks without their target and surfaces rejections', async () => {
        await expect(handler({ payload: { type: 0, totalLockTime: 30 }, dryRun: false }, {})).rejects.toThrow('needs username');
        expect(() => definition.inputSchema.payload.parse({ type: 0, username: 'bad-name', totalLockTime: 30 })).toThrow();
        client.createSslVpnLockedTunnel.mockRejectedValueOnce(new OmadaApiError(-1001, 'rejected'));
        await expect(handler({ payload: { type: 0, username: 'eve', totalLockTime: 30 }, dryRun: false }, {})).rejects.toThrow('(errorCode -1001)');
    });
});
