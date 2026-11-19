import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { OmadaClient } from '../../src/omadaClient/index.js';
import { OmadaApiError } from '../../src/omadaClient/request.js';
import { registerClearLocalUserDynamicMacTool } from '../../src/tools/clearLocalUserDynamicMac.js';

type Handler = (
    args: Record<string, unknown>,
    extra: object
) => Promise<{ structuredContent?: Record<string, unknown>; content: { text: string }[] }>;

describe('tools/clearLocalUserDynamicMac', () => {
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
        registerClearLocalUserDynamicMacTool(server, client as unknown as OmadaClient);
    });

    it('previews, then clears the MACs of a dynamic-binding user', async () => {
        expect((await handler({ userId: 'u-1' }, {})).structuredContent).toMatchObject({ status: 'planned', result: { target: { userName: 'a' } } });
        await handler({ userId: 'u-1', dryRun: false }, {});
        expect(client.clearLocalUserDynamicMac).toHaveBeenCalledWith('u-1', undefined, undefined);
    });

    it('refuses unknown users and other binding types', async () => {
        expect(() => definition.inputSchema.userId.parse('')).toThrow();
        await expect(handler({ userId: 'u-9', dryRun: false }, {})).rejects.toThrow('No hotspot local user with id "u-9"');
        await expect(handler({ userId: 'u-2', dryRun: false }, {})).rejects.toThrow('does not use dynamic MAC binding');
        expect(client.clearLocalUserDynamicMac).not.toHaveBeenCalled();
        client.clearLocalUserDynamicMac.mockRejectedValueOnce(new OmadaApiError(-1001, 'rejected'));
        await expect(handler({ userId: 'u-1', dryRun: false }, {})).rejects.toThrow('(errorCode -1001): rejected');
    });
});
