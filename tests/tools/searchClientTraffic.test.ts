import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { OmadaClient } from '../../src/omadaClient/index.js';
import { registerSearchClientTrafficTool } from '../../src/tools/searchClientTraffic.js';

type Handler = (args: Record<string, unknown>, extra: object) => Promise<{ content: { text: string }[] }>;

describe('tools/searchClientTraffic', () => {
    let handler: Handler;
    let definition: { inputSchema: Record<string, { parse: (value: unknown) => unknown }> };
    let server: McpServer;
    let client: Record<string, ReturnType<typeof vi.fn>>;

    beforeEach(() => {
        client = { searchClientTraffic: vi.fn().mockResolvedValue({ ok: true }) };
        server = {
            registerTool: vi.fn((_name, def, fn) => {
                definition = def;
                handler = fn;
            }),
        } as unknown as McpServer;
        registerSearchClientTrafficTool(server, client as unknown as OmadaClient);
    });

    it('registers and returns the controller read', async () => {
        const result = await handler({ query: { page: 1, pageSize: 10, start: 100, end: 200 }, siteId: 'site-1' }, {});
        expect(client.searchClientTraffic).toHaveBeenCalledWith({ page: 1, pageSize: 10, start: 100, end: 200 }, 'site-1', undefined);
        expect(JSON.parse(result.content[0].text)).toEqual({ ok: true });
        expect(definition.inputSchema).toBeTruthy();
    });

    it('validates the query', () => {
        expect(() => definition.inputSchema.query.parse({ page: 1, pageSize: 500 })).toThrow();
    });

    it('propagates read failures', async () => {
        client.searchClientTraffic.mockRejectedValueOnce(new Error('boom'));
        await expect(handler({ query: { page: 1, pageSize: 10, start: 100, end: 200 }, siteId: 'site-1' }, {})).rejects.toThrow('boom');
    });
});
