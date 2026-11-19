import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { OmadaClient } from '../../src/omadaClient/index.js';
import { registerListMostActiveEapsByTrafficTool } from '../../src/tools/listMostActiveEapsByTraffic.js';

type Handler = (args: Record<string, unknown>, extra: object) => Promise<{ content: { text: string }[] }>;

describe('tools/listMostActiveEapsByTraffic', () => {
    let handler: Handler;
    let definition: { inputSchema: Record<string, { parse: (value: unknown) => unknown }> };
    let server: McpServer;
    let client: Record<string, ReturnType<typeof vi.fn>>;

    beforeEach(() => {
        client = { listMostActiveEapsByTraffic: vi.fn().mockResolvedValue({ ok: true }) };
        server = {
            registerTool: vi.fn((_name, def, fn) => {
                definition = def;
                handler = fn;
            }),
        } as unknown as McpServer;
        registerListMostActiveEapsByTrafficTool(server, client as unknown as OmadaClient);
    });

    it('registers and returns the controller read', async () => {
        const result = await handler({ deviceNum: 3, start: 100, end: 200, siteId: 'site-1' }, {});
        expect(client.listMostActiveEapsByTraffic).toHaveBeenCalledWith(3, { start: 100, end: 200 }, 'site-1', undefined);
        expect(JSON.parse(result.content[0].text)).toEqual({ ok: true });
        expect(definition.inputSchema).toBeTruthy();
    });

    it('defaults to five APs', async () => {
        await handler({ start: 1, end: 2 }, {});
        expect(client.listMostActiveEapsByTraffic).toHaveBeenCalledWith(5, { start: 1, end: 2 }, undefined, undefined);
    });

    it('propagates read failures', async () => {
        client.listMostActiveEapsByTraffic.mockRejectedValueOnce(new Error('boom'));
        await expect(handler({ deviceNum: 3, start: 100, end: 200, siteId: 'site-1' }, {})).rejects.toThrow('boom');
    });
});
