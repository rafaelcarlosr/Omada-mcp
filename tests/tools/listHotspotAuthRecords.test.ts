import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { describe, expect, it, vi } from 'vitest';

import type { OmadaClient } from '../../src/omadaClient/index.js';
import { registerListHotspotAuthRecordsTool } from '../../src/tools/listHotspotAuthRecords.js';

type Handler = (
    args: Record<string, unknown>,
    extra: object
) => Promise<{ structuredContent?: Record<string, unknown>; content: { text: string }[] }>;

describe('tools/listHotspotAuthRecords', () => {
    it('registers and returns the controller read', async () => {
        let handler: Handler = async () => ({ content: [] });
        const server = { registerTool: vi.fn((_name, _def, fn) => (handler = fn)) } as unknown as McpServer;
        const client = { listHotspotAuthRecords: vi.fn().mockResolvedValue([{ id: 'ar-1' }]) };
        registerListHotspotAuthRecordsTool(server, client as unknown as OmadaClient);

        const result = await handler({ siteId: 'site-1' }, {});

        expect(server.registerTool).toHaveBeenCalledWith(
            'listHotspotAuthRecords',
            expect.objectContaining({ description: expect.any(String) }),
            expect.any(Function)
        );
        expect(client.listHotspotAuthRecords).toHaveBeenCalledWith('site-1', undefined);
        expect(JSON.parse(result.content[0].text)).toEqual([{ id: 'ar-1' }]);
    });

    it('propagates read failures', async () => {
        let handler: Handler = async () => ({ content: [] });
        const server = { registerTool: vi.fn((_name, _def, fn) => (handler = fn)) } as unknown as McpServer;
        registerListHotspotAuthRecordsTool(server, {
            listHotspotAuthRecords: vi.fn().mockRejectedValue(new Error('boom')),
        } as unknown as OmadaClient);
        await expect(handler({}, {})).rejects.toThrow('boom');
    });
});
