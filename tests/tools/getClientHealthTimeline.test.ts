import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { OmadaClient } from '../../src/omadaClient/index.js';
import { registerGetClientHealthTimelineTool } from '../../src/tools/getClientHealthTimeline.js';

type Handler = (
    args: Record<string, unknown>,
    extra: object
) => Promise<{ structuredContent?: Record<string, unknown>; content: { text: string }[] }>;

describe('tools/getClientHealthTimeline', () => {
    let handler: Handler;
    let definition: { inputSchema: Record<string, { parse: (value: unknown) => unknown }> };
    let server: McpServer;
    let client: Record<string, ReturnType<typeof vi.fn>>;

    beforeEach(() => {
        client = { getClientHealthTimeline: vi.fn().mockResolvedValue({ ok: true }) };
        server = {
            registerTool: vi.fn((_name, def, fn) => {
                definition = def;
                handler = fn;
            }),
        } as unknown as McpServer;
        registerGetClientHealthTimelineTool(server, client as unknown as OmadaClient);
    });

    it('registers and returns the controller read', async () => {
        const result = await handler({ clientMac: 'AA-BB-CC-DD-EE-03', start: 1795030000000, end: 1795033600000, siteId: 'site-1' }, {});

        expect(server.registerTool).toHaveBeenCalledWith(
            'getClientHealthTimeline',
            expect.objectContaining({ description: expect.any(String) }),
            expect.any(Function)
        );
        expect(client.getClientHealthTimeline).toHaveBeenCalledWith(
            'AA-BB-CC-DD-EE-03',
            { start: 1795030000000, end: 1795033600000 },
            'site-1',
            undefined
        );
        expect(JSON.parse(result.content[0].text)).toEqual({ ok: true });
    });

    it('validates the MAC', () => {
        expect(() => definition.inputSchema.clientMac.parse('not-a-mac')).toThrow();
    });

    it('requires non-negative integer times', () => {
        expect(() => definition.inputSchema.start.parse(-1)).toThrow();
        expect(() => definition.inputSchema.end.parse(1.5)).toThrow();
    });

    it('propagates read failures', async () => {
        client.getClientHealthTimeline.mockRejectedValueOnce(new Error('boom'));
        await expect(handler({ clientMac: 'AA-BB-CC-DD-EE-03', start: 1795030000000, end: 1795033600000 }, {})).rejects.toThrow('boom');
    });
});
