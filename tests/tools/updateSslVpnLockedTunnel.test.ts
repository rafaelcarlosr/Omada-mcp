import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { OmadaClient } from '../../src/omadaClient/index.js';
import { OmadaApiError } from '../../src/omadaClient/request.js';
import { registerUpdateSslVpnLockedTunnelTool } from '../../src/tools/updateSslVpnLockedTunnel.js';

type Handler = (
    args: Record<string, unknown>,
    extra: object
) => Promise<{ structuredContent?: Record<string, unknown>; content: { text: string }[] }>;

describe('tools/updateSslVpnLockedTunnel', () => {
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
        registerUpdateSslVpnLockedTunnelTool(server, client as unknown as OmadaClient);
    });

    it('changes the lock time, keeping the target, and verifies', async () => {
        const result = await handler({ lockTunnelId: 'l1', changes: { totalLockTime: 120 }, dryRun: false }, {});
        expect(client.updateSslVpnLockedTunnel).toHaveBeenCalledWith('l1', { type: 1, ip: '10.0.0.5', totalLockTime: 120 }, undefined, undefined);
        expect(result.structuredContent).toMatchObject({ status: 'verified' });
    });

    it('refuses unknown locks, empty changes and a target type without its value', async () => {
        await expect(handler({ lockTunnelId: 'zz', changes: { totalLockTime: 5 }, dryRun: false }, {})).rejects.toThrow(
            'No locked SSL VPN tunnel with id "zz"'
        );
        await expect(handler({ lockTunnelId: 'l1', changes: { type: 0 }, dryRun: false }, {})).rejects.toThrow('needs username');
        expect(() => definition.inputSchema.changes.parse({})).toThrow('At least one change is required.');
    });
});
