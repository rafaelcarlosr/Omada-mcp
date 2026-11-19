import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { OmadaClient } from '../../src/omadaClient/index.js';
import { registerListWifiHealthTopClientsTool } from '../../src/tools/listWifiHealthTopClients.js';

type Handler = (args: Record<string, unknown>, extra: object) => Promise<{ content: { text: string }[] }>;

describe('tools/listWifiHealthTopClients', () => {
    let handler: Handler;
    let server: McpServer;
    let client: Record<string, ReturnType<typeof vi.fn>>;

    beforeEach(() => {
        client = { listWifiHealthTopClients: vi.fn().mockResolvedValue({ ok: true }) };
        server = {
            registerTool: vi.fn((_name, _def, fn) => {
                handler = fn;
            }),
        } as unknown as McpServer;
        registerListWifiHealthTopClientsTool(server, client as unknown as OmadaClient);
    });

    it('registers and returns the controller read', async () => {
        const result = await handler({ time: 100, topK: 5, searchKey: 'ab', siteId: 'site-1' }, {});

        expect(server.registerTool).toHaveBeenCalledWith(
            'listWifiHealthTopClients',
            expect.objectContaining({ description: expect.any(String) }),
            expect.any(Function)
        );
        expect(client.listWifiHealthTopClients).toHaveBeenCalledWith(100, 5, 'ab', 'site-1', undefined);
        expect(JSON.parse(result.content[0].text)).toEqual({ ok: true });
    });

    it('propagates read failures', async () => {
        client.listWifiHealthTopClients.mockRejectedValueOnce(new Error('boom'));
        await expect(handler({ time: 100, topK: 5, searchKey: 'ab', siteId: 'site-1' }, {})).rejects.toThrow('boom');
    });
});
