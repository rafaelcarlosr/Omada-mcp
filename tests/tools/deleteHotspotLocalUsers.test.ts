import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { OmadaClient } from '../../src/omadaClient/index.js';
import { OmadaApiError } from '../../src/omadaClient/request.js';
import { registerDeleteHotspotLocalUsersTool } from '../../src/tools/deleteHotspotLocalUsers.js';

type Handler = (
    args: Record<string, unknown>,
    extra: object
) => Promise<{ structuredContent?: Record<string, unknown>; content: { text: string }[] }>;

describe('tools/deleteHotspotLocalUsers', () => {
    let handler: Handler;
    let definition: { inputSchema: Record<string, { parse: (value: unknown) => unknown }> };
    let client: Record<string, ReturnType<typeof vi.fn>>;
    let users: Record<string, unknown>[];

    beforeEach(() => {
        users = [
            { id: 'u-1', userName: 'a', password: 'pw-a', bindingType: 2 },
            { id: 'u-2', userName: 'b', password: 'pw-b', bindingType: 0 },
        ];
        client = {
            listHotspotLocalUsers: vi.fn(async () => users),
            deleteHotspotLocalUsers: vi.fn((ids: string[]) => {
                users = users.filter((user) => !ids.includes(String(user.id)));
                return Promise.resolve(undefined);
            }),
            clearLocalUserDynamicMac: vi.fn(async () => undefined),
        };
        const server = {
            registerTool: vi.fn((_name, def, fn) => {
                definition = def;
                handler = fn;
            }),
        } as unknown as McpServer;
        registerDeleteHotspotLocalUsersTool(server, client as unknown as OmadaClient);
    });

    it('previews without passwords, then deletes and verifies they are gone', async () => {
        const preview = await handler({ userIds: ['u-1', 'u-2'] }, {});
        expect(JSON.stringify(preview.structuredContent)).not.toContain('pw-a');
        const result = await handler({ userIds: ['u-1', 'u-2'], dryRun: false }, {});
        expect(client.deleteHotspotLocalUsers).toHaveBeenCalledWith(['u-1', 'u-2'], undefined, undefined);
        expect(result.structuredContent).toMatchObject({ status: 'verified' });
    });

    it('refuses unknown users and surfaces rejections', async () => {
        expect(() => definition.inputSchema.userIds.parse([])).toThrow();
        await expect(handler({ userIds: ['u-9'], dryRun: false }, {})).rejects.toThrow('No hotspot local user with id "u-9"');
        client.deleteHotspotLocalUsers.mockRejectedValueOnce(new OmadaApiError(-1001, 'rejected'));
        await expect(handler({ userIds: ['u-1'], dryRun: false }, {})).rejects.toThrow('(errorCode -1001): rejected');
    });
});
