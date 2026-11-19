import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { OmadaClient } from '../../src/omadaClient/index.js';
import { registerListInfluencingClientsTool } from '../../src/tools/listInfluencingClients.js';

type Handler = (args: Record<string, unknown>, extra: object) => Promise<{ content: { text: string }[] }>;

describe('tools/listInfluencingClients', () => {
    let handler: Handler;
    let server: McpServer;
    let client: Record<string, ReturnType<typeof vi.fn>>;

    beforeEach(() => {
        client = { listInfluencingClients: vi.fn().mockResolvedValue({ ok: true }) };
        server = {
            registerTool: vi.fn((_name, _def, fn) => {
                handler = fn;
            }),
        } as unknown as McpServer;
        registerListInfluencingClientsTool(server, client as unknown as OmadaClient);
    });

    it('registers and returns the controller read', async () => {
        const result = await handler({ deviceMac: 'AA-BB-CC-DD-EE-01', anomalyCode: 'x-1', page: 2, pageSize: 5, siteId: 'site-1' }, {});

        expect(server.registerTool).toHaveBeenCalledWith(
            'listInfluencingClients',
            expect.objectContaining({ description: expect.any(String) }),
            expect.any(Function)
        );
        expect(client.listInfluencingClients).toHaveBeenCalledWith('AA-BB-CC-DD-EE-01', 'x-1', 2, 5, 'site-1', undefined);
        expect(JSON.parse(result.content[0].text)).toEqual({ ok: true });
    });

    it('propagates read failures', async () => {
        client.listInfluencingClients.mockRejectedValueOnce(new Error('boom'));
        await expect(handler({ deviceMac: 'AA-BB-CC-DD-EE-01', anomalyCode: 'x-1', page: 2, pageSize: 5, siteId: 'site-1' }, {})).rejects.toThrow(
            'boom'
        );
    });
});
