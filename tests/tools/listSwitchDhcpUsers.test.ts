import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { OmadaClient } from '../../src/omadaClient/index.js';
import { registerListSwitchDhcpUsersTool } from '../../src/tools/listSwitchDhcpUsers.js';

type Handler = (
    args: Record<string, unknown>,
    extra: object
) => Promise<{ structuredContent?: Record<string, unknown>; content: { text: string }[] }>;

describe('tools/listSwitchDhcpUsers', () => {
    let handler: Handler;
    let definition: { inputSchema: Record<string, { parse: (value: unknown) => unknown }> };
    let server: McpServer;
    let client: Record<string, ReturnType<typeof vi.fn>>;

    beforeEach(() => {
        client = { listSwitchDhcpUsers: vi.fn().mockResolvedValue([{ port: 1, name: 'Port1' }]) };
        server = {
            registerTool: vi.fn((_name, def, fn) => {
                definition = def;
                handler = fn;
            }),
        } as unknown as McpServer;
        registerListSwitchDhcpUsersTool(server, client as unknown as OmadaClient);
    });

    it('registers and returns the controller read', async () => {
        const result = await handler({ switchMac: 'AA-BB-CC-DD-EE-01', siteId: 'site-1' }, {});

        expect(server.registerTool).toHaveBeenCalledWith(
            'listSwitchDhcpUsers',
            expect.objectContaining({ description: expect.any(String) }),
            expect.any(Function)
        );
        expect(client.listSwitchDhcpUsers).toHaveBeenCalledWith('AA-BB-CC-DD-EE-01', 'site-1', undefined);
        expect(JSON.parse(result.content[0].text)).toEqual([{ port: 1, name: 'Port1' }]);
    });

    it('validates the switch MAC', () => {
        expect(() => definition.inputSchema.switchMac.parse('not-a-mac')).toThrow();
    });

    it('propagates read failures', async () => {
        client.listSwitchDhcpUsers.mockRejectedValueOnce(new Error('boom'));
        await expect(handler({ switchMac: 'AA-BB-CC-DD-EE-01' }, {})).rejects.toThrow('boom');
    });
});
