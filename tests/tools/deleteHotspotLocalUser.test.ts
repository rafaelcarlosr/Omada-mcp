import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { OmadaClient } from '../../src/omadaClient/index.js';
import { OmadaApiError } from '../../src/omadaClient/request.js';
import { registerDeleteHotspotLocalUserTool } from '../../src/tools/deleteHotspotLocalUser.js';

type Handler = (
    args: Record<string, unknown>,
    extra: object
) => Promise<{ structuredContent?: Record<string, unknown>; content: { text: string }[] }>;

describe('tools/deleteHotspotLocalUser', () => {
    let handler: Handler;
    let definition: { inputSchema: Record<string, { parse: (value: unknown) => unknown }> };
    let client: Record<string, ReturnType<typeof vi.fn>>;
    let users: Record<string, unknown>[];

    beforeEach(() => {
        users = [
            {
                id: 'lu-1',
                userName: 'existing',
                password: 'old-secret',
                enable: false,
                expirationTime: 1,
                bindingType: 0,
                rateLimit: { mode: 0 },
                trafficLimitEnable: false,
                portals: [],
            },
        ];
        client = {
            listHotspotLocalUsers: vi.fn(async () => users),
            createHotspotLocalUser: vi.fn((body: Record<string, unknown>) => {
                users = [...users, { ...body, id: 'new-1' }];
                return Promise.resolve({});
            }),
            updateHotspotLocalUser: vi.fn((id: string, body: Record<string, unknown>) => {
                users = users.map((row) => (row.id === id ? { ...row, ...body } : row));
                return Promise.resolve({});
            }),
            deleteHotspotLocalUser: vi.fn((id: string) => {
                users = users.filter((row) => row.id !== id);
                return Promise.resolve({});
            }),
        };
        const server = {
            registerTool: vi.fn((_name, def, fn) => {
                definition = def;
                handler = fn;
            }),
        } as unknown as McpServer;
        registerDeleteHotspotLocalUserTool(server, client as unknown as OmadaClient);
    });

    it('validates the id', () => {
        expect(() => definition.inputSchema.userId.parse('')).toThrow();
    });

    it('previews the record without deleting', async () => {
        const result = await handler({ userId: 'lu-1' }, {});
        expect(client.deleteHotspotLocalUser).not.toHaveBeenCalled();
        expect(result.structuredContent).toMatchObject({ status: 'planned', result: { id: 'lu-1' } });
    });

    it('deletes once and verifies it is gone', async () => {
        const result = await handler({ userId: 'lu-1', dryRun: false }, {});
        expect(client.deleteHotspotLocalUser).toHaveBeenCalledWith('lu-1', undefined, undefined);
        expect(result.structuredContent).toMatchObject({ status: 'verified' });
    });

    it('keeps the stored password out of the preview', async () => {
        const result = await handler({ userId: 'lu-1' }, {});
        expect(JSON.stringify(result.structuredContent)).not.toContain('old-secret');
    });

    it('surfaces controller rejections', async () => {
        client.deleteHotspotLocalUser.mockRejectedValueOnce(new OmadaApiError(-33000, 'rejected'));
        await expect(handler({ userId: 'lu-1', dryRun: false }, {})).rejects.toThrow('(errorCode -33000): rejected');
    });
});
