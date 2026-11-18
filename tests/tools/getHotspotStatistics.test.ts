import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { describe, expect, it, vi } from 'vitest';

import type { OmadaClient } from '../../src/omadaClient/index.js';
import { registerGetHotspotStatisticsTool } from '../../src/tools/getHotspotStatistics.js';

type Handler = (
    args: Record<string, unknown>,
    extra: object
) => Promise<{ structuredContent?: Record<string, unknown>; content: { text: string }[] }>;

describe('tools/getHotspotStatistics', () => {
    it('registers and returns the controller read', async () => {
        let handler: Handler = async () => ({ content: [] });
        const server = { registerTool: vi.fn((_name, _def, fn) => (handler = fn)) } as unknown as McpServer;
        const client = { getHotspotStatistics: vi.fn().mockResolvedValue({ lastConnection: [] }) };
        registerGetHotspotStatisticsTool(server, client as unknown as OmadaClient);

        const result = await handler({ start: 1, end: 2 }, {});

        expect(server.registerTool).toHaveBeenCalledWith(
            'getHotspotStatistics',
            expect.objectContaining({ description: expect.any(String) }),
            expect.any(Function)
        );
        expect(client.getHotspotStatistics).toHaveBeenCalledWith({ start: 1, end: 2 }, undefined, undefined);
        expect(result.structuredContent).toEqual({ lastConnection: [] });
    });

    it('propagates read failures', async () => {
        let handler: Handler = async () => ({ content: [] });
        const server = { registerTool: vi.fn((_name, _def, fn) => (handler = fn)) } as unknown as McpServer;
        registerGetHotspotStatisticsTool(server, { getHotspotStatistics: vi.fn().mockRejectedValue(new Error('boom')) } as unknown as OmadaClient);
        await expect(handler({}, {})).rejects.toThrow('boom');
    });
});
