import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { OmadaClient } from '../../src/omadaClient/index.js';
import { OmadaApiError } from '../../src/omadaClient/request.js';
import { registerDeleteSslVpnLockTool } from '../../src/tools/deleteSslVpnLock.js';

type Handler = (
    args: Record<string, unknown>,
    extra: object
) => Promise<{ structuredContent?: Record<string, unknown>; content: { text: string }[] }>;

describe('tools/deleteSslVpnLock', () => {
    let handler: Handler;
    let definition: { inputSchema: Record<string, { parse: (value: unknown) => unknown }> };
    let client: Record<string, ReturnType<typeof vi.fn>>;
    let rows: Record<string, unknown>[];

    beforeEach(() => {
        rows = [{ id: 'l-1', type: 0, username: 'mallory', totalLockTime: 5, leftLockTime: 3 }];
        client = {
            listSslVpnLocks: vi.fn(async () => rows),
            createSslVpnLock: vi.fn((body: Record<string, unknown>) => {
                rows = [...rows, { ...body, id: 'new-1' }];
                return Promise.resolve({});
            }),
            updateSslVpnLock: vi.fn((id: string, body: Record<string, unknown>) => {
                rows = rows.map((row) => (row.id === id ? { ...row, ...body } : row));
                return Promise.resolve({});
            }),
            deleteSslVpnLock: vi.fn((id: string) => {
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
        registerDeleteSslVpnLockTool(server, client as unknown as OmadaClient);
    });

    it('validates the id', () => {
        expect(() => definition.inputSchema.lockId.parse('')).toThrow();
    });

    it('previews the record without deleting', async () => {
        const result = await handler({ lockId: 'l-1' }, {});
        expect(client.deleteSslVpnLock).not.toHaveBeenCalled();
        expect(result.structuredContent).toMatchObject({ status: 'planned', result: { id: 'l-1' } });
    });

    it('deletes once and verifies it is gone', async () => {
        const result = await handler({ lockId: 'l-1', siteId: 'site-1', dryRun: false }, {});
        expect(client.deleteSslVpnLock).toHaveBeenCalledWith('l-1', 'site-1', undefined);
        expect(result.structuredContent).toMatchObject({ status: 'verified' });
    });

    it('refuses unknown ids', async () => {
        await expect(handler({ lockId: 'missing', dryRun: false }, {})).rejects.toThrow('No SSL VPN lock with id "missing"');
    });

    it('surfaces controller rejections', async () => {
        client.deleteSslVpnLock.mockRejectedValueOnce(new OmadaApiError(-1001, 'rejected'));
        await expect(handler({ lockId: 'l-1', dryRun: false }, {})).rejects.toThrow('(errorCode -1001): rejected');
    });
});
