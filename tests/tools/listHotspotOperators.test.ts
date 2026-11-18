import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { describe, expect, it, vi } from 'vitest';

import type { OmadaClient } from '../../src/omadaClient/index.js';
import { registerListHotspotOperatorsTool } from '../../src/tools/listHotspotOperators.js';

type Handler = (
    args: Record<string, unknown>,
    extra: object
) => Promise<{ structuredContent?: Record<string, unknown>; content: { text: string }[] }>;

describe('tools/listHotspotOperators', () => {
    it('registers and returns the controller read', async () => {
        let handler: Handler = async () => ({ content: [] });
        const server = { registerTool: vi.fn((_name, _def, fn) => (handler = fn)) } as unknown as McpServer;
        const client = { listHotspotOperators: vi.fn().mockResolvedValue([{ id: 'op-1', name: 'desk', password: 'clear' }, { id: 'op-2' }]) };
        registerListHotspotOperatorsTool(server, client as unknown as OmadaClient);

        const result = await handler({ siteId: 'site-1' }, {});

        expect(server.registerTool).toHaveBeenCalledWith(
            'listHotspotOperators',
            expect.objectContaining({ description: expect.any(String) }),
            expect.any(Function)
        );
        expect(client.listHotspotOperators).toHaveBeenCalledWith('site-1', undefined);
        expect(JSON.parse(result.content[0].text)).toEqual([{ id: 'op-1', name: 'desk', password: '[redacted]' }, { id: 'op-2' }]);
    });

    it('propagates read failures', async () => {
        let handler: Handler = async () => ({ content: [] });
        const server = { registerTool: vi.fn((_name, _def, fn) => (handler = fn)) } as unknown as McpServer;
        registerListHotspotOperatorsTool(server, { listHotspotOperators: vi.fn().mockRejectedValue(new Error('boom')) } as unknown as OmadaClient);
        await expect(handler({}, {})).rejects.toThrow('boom');
    });
});
