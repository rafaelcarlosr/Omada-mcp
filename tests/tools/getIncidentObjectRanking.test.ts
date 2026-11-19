import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { OmadaClient } from '../../src/omadaClient/index.js';
import { registerGetIncidentObjectRankingTool } from '../../src/tools/getIncidentObjectRanking.js';

type Handler = (args: Record<string, unknown>, extra: object) => Promise<{ content: { text: string }[] }>;

describe('tools/getIncidentObjectRanking', () => {
    let handler: Handler;
    let server: McpServer;
    let client: Record<string, ReturnType<typeof vi.fn>>;

    beforeEach(() => {
        client = { getIncidentObjectRanking: vi.fn().mockResolvedValue({ ok: true }) };
        server = {
            registerTool: vi.fn((_name, _def, fn) => {
                handler = fn;
            }),
        } as unknown as McpServer;
        registerGetIncidentObjectRankingTool(server, client as unknown as OmadaClient);
    });

    it('registers and returns the controller read', async () => {
        const result = await handler({ startTime: 100, endTime: 200, anomalyCode: 1003014, topK: 3, siteId: 'site-1' }, {});

        expect(server.registerTool).toHaveBeenCalledWith(
            'getIncidentObjectRanking',
            expect.objectContaining({ description: expect.any(String) }),
            expect.any(Function)
        );
        expect(client.getIncidentObjectRanking).toHaveBeenCalledWith(
            { startTime: 100, endTime: 200, anomalyCode: 1003014, topK: 3 },
            'site-1',
            undefined
        );
        expect(JSON.parse(result.content[0].text)).toEqual({ ok: true });
    });

    it('propagates read failures', async () => {
        client.getIncidentObjectRanking.mockRejectedValueOnce(new Error('boom'));
        await expect(handler({ startTime: 100, endTime: 200, anomalyCode: 1003014, topK: 3, siteId: 'site-1' }, {})).rejects.toThrow('boom');
    });
});
