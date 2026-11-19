import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { OmadaClient } from '../../src/omadaClient/index.js';
import { registerListStackIncidentsTool } from '../../src/tools/listStackIncidents.js';

type Handler = (args: Record<string, unknown>, extra: object) => Promise<{ content: { text: string }[] }>;

describe('tools/listStackIncidents', () => {
    let handler: Handler;
    let server: McpServer;
    let client: Record<string, ReturnType<typeof vi.fn>>;

    beforeEach(() => {
        client = { listStackIncidents: vi.fn().mockResolvedValue({ ok: true }) };
        server = {
            registerTool: vi.fn((_name, _def, fn) => {
                handler = fn;
            }),
        } as unknown as McpServer;
        registerListStackIncidentsTool(server, client as unknown as OmadaClient);
    });

    it('registers and returns the controller read', async () => {
        const result = await handler({ stackId: 'x-1', startTime: 100, endTime: 200, page: 2, pageSize: 5, siteId: 'site-1' }, {});

        expect(server.registerTool).toHaveBeenCalledWith(
            'listStackIncidents',
            expect.objectContaining({ description: expect.any(String) }),
            expect.any(Function)
        );
        expect(client.listStackIncidents).toHaveBeenCalledWith('x-1', { startTime: 100, endTime: 200 }, 2, 5, 'site-1', undefined);
        expect(JSON.parse(result.content[0].text)).toEqual({ ok: true });
    });

    it('propagates read failures', async () => {
        client.listStackIncidents.mockRejectedValueOnce(new Error('boom'));
        await expect(handler({ stackId: 'x-1', startTime: 100, endTime: 200, page: 2, pageSize: 5, siteId: 'site-1' }, {})).rejects.toThrow('boom');
    });
});
