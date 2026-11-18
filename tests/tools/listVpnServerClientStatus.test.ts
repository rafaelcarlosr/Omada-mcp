import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { OmadaClient } from '../../src/omadaClient/index.js';
import { registerListVpnServerClientStatusTool } from '../../src/tools/listVpnServerClientStatus.js';

type Handler = (
    args: Record<string, unknown>,
    extra: object
) => Promise<{ structuredContent?: Record<string, unknown>; content: { text: string }[] }>;

describe('tools/listVpnServerClientStatus', () => {
    let handler: Handler;
    let definition: { inputSchema: Record<string, { parse: (value: unknown) => unknown }> };
    let server: McpServer;
    let client: Record<string, ReturnType<typeof vi.fn>>;

    beforeEach(() => {
        client = { listVpnServerClientStatus: vi.fn().mockResolvedValue([{ id: 'row-1', name: 'first' }]) };
        server = {
            registerTool: vi.fn((_name, def, fn) => {
                definition = def;
                handler = fn;
            }),
        } as unknown as McpServer;
        registerListVpnServerClientStatusTool(server, client as unknown as OmadaClient);
    });

    it('registers and returns the controller read', async () => {
        const result = await handler({ vpnId: 'vpn-1', siteId: 'site-1' }, {});

        expect(server.registerTool).toHaveBeenCalledWith(
            'listVpnServerClientStatus',
            expect.objectContaining({ description: expect.any(String) }),
            expect.any(Function)
        );
        expect(client.listVpnServerClientStatus).toHaveBeenCalledWith('vpn-1', 'site-1', undefined);
        expect(JSON.parse(result.content[0].text)).toEqual([{ id: 'row-1', name: 'first' }]);
    });

    it('validates the id', () => {
        expect(() => definition.inputSchema.vpnId.parse('')).toThrow();
    });

    it('propagates read failures', async () => {
        client.listVpnServerClientStatus.mockRejectedValueOnce(new Error('boom'));
        await expect(handler({ vpnId: 'vpn-1' }, {})).rejects.toThrow('boom');
    });
});
