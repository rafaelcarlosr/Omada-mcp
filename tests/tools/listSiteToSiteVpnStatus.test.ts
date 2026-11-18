import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { OmadaClient } from '../../src/omadaClient/index.js';
import { registerListSiteToSiteVpnStatusTool } from '../../src/tools/listSiteToSiteVpnStatus.js';

type Handler = (
    args: Record<string, unknown>,
    extra: object
) => Promise<{ structuredContent?: Record<string, unknown>; content: { text: string }[] }>;

describe('tools/listSiteToSiteVpnStatus', () => {
    let handler: Handler;
    let definition: { inputSchema: Record<string, { parse: (value: unknown) => unknown }> };
    let server: McpServer;
    let client: Record<string, ReturnType<typeof vi.fn>>;

    beforeEach(() => {
        client = { listSiteToSiteVpnStatus: vi.fn().mockResolvedValue([{ id: 'row-1', name: 'first' }]) };
        server = {
            registerTool: vi.fn((_name, def, fn) => {
                definition = def;
                handler = fn;
            }),
        } as unknown as McpServer;
        registerListSiteToSiteVpnStatusTool(server, client as unknown as OmadaClient);
    });

    it('registers and returns the controller read', async () => {
        const result = await handler({ vpnType: 2, siteId: 'site-1' }, {});

        expect(server.registerTool).toHaveBeenCalledWith(
            'listSiteToSiteVpnStatus',
            expect.objectContaining({ description: expect.any(String) }),
            expect.any(Function)
        );
        expect(client.listSiteToSiteVpnStatus).toHaveBeenCalledWith(2, 'site-1', undefined);
        expect(JSON.parse(result.content[0].text)).toEqual([{ id: 'row-1', name: 'first' }]);
    });

    it('accepts only the VPN types the controller supports', () => {
        expect(() => definition.inputSchema.vpnType.parse(0)).toThrow();
        expect(definition.inputSchema.vpnType.parse(2)).toBe(2);
    });

    it('propagates read failures', async () => {
        client.listSiteToSiteVpnStatus.mockRejectedValueOnce(new Error('boom'));
        await expect(handler({ vpnType: 2 }, {})).rejects.toThrow('boom');
    });
});
