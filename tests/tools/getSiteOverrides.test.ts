import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { OmadaClient } from '../../src/omadaClient/index.js';
import { registerGetSiteOverridesTool } from '../../src/tools/getSiteOverrides.js';

type Handler = (args: Record<string, unknown>, extra: object) => Promise<{ content: { text: string }[] }>;

describe('tools/getSiteOverrides', () => {
    let handler: Handler;
    let definition: { inputSchema: Record<string, { parse: (value: unknown) => unknown }> };
    let server: McpServer;
    let client: Record<string, ReturnType<typeof vi.fn>>;

    beforeEach(() => {
        client = { getSiteOverrides: vi.fn().mockResolvedValue({ ok: true }) };
        server = {
            registerTool: vi.fn((_name, def, fn) => {
                definition = def;
                handler = fn;
            }),
        } as unknown as McpServer;
        registerGetSiteOverridesTool(server, client as unknown as OmadaClient);
    });

    it('registers and returns the controller read', async () => {
        const result = await handler({ siteIds: ['a', 'b'] }, {});

        expect(server.registerTool).toHaveBeenCalledWith(
            'getSiteOverrides',
            expect.objectContaining({ description: expect.any(String) }),
            expect.any(Function)
        );
        expect(client.getSiteOverrides).toHaveBeenCalledWith(['a', 'b'], undefined);
        expect(JSON.parse(result.content[0].text)).toEqual({ ok: true });
        expect(definition.inputSchema).toBeTruthy();
    });

    it('validates the site IDs', () => {
        expect(() => definition.inputSchema.siteIds.parse([])).toThrow();
    });

    it('propagates read failures', async () => {
        client.getSiteOverrides.mockRejectedValueOnce(new Error('boom'));
        await expect(handler({ siteIds: ['a', 'b'] }, {})).rejects.toThrow('boom');
    });
});
