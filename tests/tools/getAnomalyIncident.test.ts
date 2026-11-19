import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { OmadaClient } from '../../src/omadaClient/index.js';
import { registerGetAnomalyIncidentTool } from '../../src/tools/getAnomalyIncident.js';

type Handler = (args: Record<string, unknown>, extra: object) => Promise<{ content: { text: string }[] }>;

describe('tools/getAnomalyIncident', () => {
    let handler: Handler;
    let server: McpServer;
    let client: Record<string, ReturnType<typeof vi.fn>>;

    beforeEach(() => {
        client = { getAnomalyIncident: vi.fn().mockResolvedValue({ ok: true }) };
        server = {
            registerTool: vi.fn((_name, _def, fn) => {
                handler = fn;
            }),
        } as unknown as McpServer;
        registerGetAnomalyIncidentTool(server, client as unknown as OmadaClient);
    });

    it('registers and returns the controller read', async () => {
        const result = await handler({ incidentId: 'x-1', siteId: 'site-1' }, {});

        expect(server.registerTool).toHaveBeenCalledWith(
            'getAnomalyIncident',
            expect.objectContaining({ description: expect.any(String) }),
            expect.any(Function)
        );
        expect(client.getAnomalyIncident).toHaveBeenCalledWith('x-1', 'site-1', undefined);
        expect(JSON.parse(result.content[0].text)).toEqual({ ok: true });
    });

    it('propagates read failures', async () => {
        client.getAnomalyIncident.mockRejectedValueOnce(new Error('boom'));
        await expect(handler({ incidentId: 'x-1', siteId: 'site-1' }, {})).rejects.toThrow('boom');
    });
});
