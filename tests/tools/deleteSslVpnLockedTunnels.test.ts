import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { OmadaClient } from '../../src/omadaClient/index.js';
import { OmadaApiError } from '../../src/omadaClient/request.js';
import { registerDeleteSslVpnLockedTunnelsTool } from '../../src/tools/deleteSslVpnLockedTunnels.js';

type Handler = (
    args: Record<string, unknown>,
    extra: object
) => Promise<{ structuredContent?: Record<string, unknown>; content: { text: string }[] }>;

describe('tools/deleteSslVpnLockedTunnels', () => {
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
        registerDeleteSslVpnLockedTunnelsTool(server, client as unknown as OmadaClient);
    });

    it('deletes one lock through the single route and verifies', async () => {
        expect((await handler({ lockTunnelIds: ['l1'] }, {})).structuredContent).toMatchObject({ status: 'planned' });
        const result = await handler({ lockTunnelIds: ['l1', 'l1'], dryRun: false }, {});
        expect(client.deleteSslVpnLockedTunnel).toHaveBeenCalledWith('l1', undefined, undefined);
        expect(client.deleteSslVpnLockedTunnels).not.toHaveBeenCalled();
        expect(result.structuredContent).toMatchObject({ status: 'verified' });
    });

    it('deletes several locks through the batch route and refuses unknown IDs', async () => {
        await handler({ lockTunnelIds: ['l1', 'l2'], dryRun: false }, {});
        expect(client.deleteSslVpnLockedTunnels).toHaveBeenCalledWith(['l1', 'l2'], undefined, undefined);
        await expect(handler({ lockTunnelIds: ['zz'], dryRun: false }, {})).rejects.toThrow('No locked SSL VPN tunnel with id "zz"');
        expect(definition.inputSchema.lockTunnelIds).toBeTruthy();
    });
});
