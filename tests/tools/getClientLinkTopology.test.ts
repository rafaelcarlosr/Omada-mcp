import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { OmadaClient } from '../../src/omadaClient/index.js';
import { registerGetClientLinkTopologyTool } from '../../src/tools/getClientLinkTopology.js';

type Handler = (
    args: Record<string, unknown>,
    extra: object
) => Promise<{ structuredContent?: Record<string, unknown>; content: { text: string }[] }>;

describe('tools/getClientLinkTopology', () => {
    let handler: Handler;
    let definition: { inputSchema: Record<string, { parse: (value: unknown) => unknown }> };
    let server: McpServer;
    let client: Record<string, ReturnType<typeof vi.fn>>;

    beforeEach(() => {
        client = { getClientLinkTopology: vi.fn().mockResolvedValue({ ok: true }) };
        server = {
            registerTool: vi.fn((_name, def, fn) => {
                definition = def;
                handler = fn;
            }),
        } as unknown as McpServer;
        registerGetClientLinkTopologyTool(server, client as unknown as OmadaClient);
    });

    it('registers and returns the controller read', async () => {
        const result = await handler({ clientMac: 'AA-BB-CC-DD-EE-03', siteId: 'site-1' }, {});

        expect(server.registerTool).toHaveBeenCalledWith(
            'getClientLinkTopology',
            expect.objectContaining({ description: expect.any(String) }),
            expect.any(Function)
        );
        expect(client.getClientLinkTopology).toHaveBeenCalledWith('AA-BB-CC-DD-EE-03', 'site-1', undefined);
        expect(JSON.parse(result.content[0].text)).toEqual({ ok: true });
    });

    it('validates the MAC', () => {
        expect(() => definition.inputSchema.clientMac.parse('not-a-mac')).toThrow();
    });

    it('propagates read failures', async () => {
        client.getClientLinkTopology.mockRejectedValueOnce(new Error('boom'));
        await expect(handler({ clientMac: 'AA-BB-CC-DD-EE-03' }, {})).rejects.toThrow('boom');
    });
});
