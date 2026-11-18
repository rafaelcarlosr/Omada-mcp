import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { describe, expect, it, vi } from 'vitest';

import type { OmadaClient } from '../../src/omadaClient/index.js';
import { registerListHotspotLocalUsersTool } from '../../src/tools/listHotspotLocalUsers.js';

type Handler = (
    args: Record<string, unknown>,
    extra: object
) => Promise<{ structuredContent?: Record<string, unknown>; content: { text: string }[] }>;

describe('tools/listHotspotLocalUsers', () => {
    it('registers and returns the controller read', async () => {
        let handler: Handler = async () => ({ content: [] });
        const server = { registerTool: vi.fn((_name, _def, fn) => (handler = fn)) } as unknown as McpServer;
        const client = { listHotspotLocalUsers: vi.fn().mockResolvedValue([{ id: 'lu-1', userName: 'guest', password: 'clear' }]) };
        registerListHotspotLocalUsersTool(server, client as unknown as OmadaClient);

        const result = await handler({ siteId: 'site-1' }, {});

        expect(server.registerTool).toHaveBeenCalledWith(
            'listHotspotLocalUsers',
            expect.objectContaining({ description: expect.any(String) }),
            expect.any(Function)
        );
        expect(client.listHotspotLocalUsers).toHaveBeenCalledWith('site-1', undefined);
        expect(JSON.parse(result.content[0].text)).toEqual([{ id: 'lu-1', userName: 'guest', password: '[redacted]' }]);
    });

    it('propagates read failures', async () => {
        let handler: Handler = async () => ({ content: [] });
        const server = { registerTool: vi.fn((_name, _def, fn) => (handler = fn)) } as unknown as McpServer;
        registerListHotspotLocalUsersTool(server, { listHotspotLocalUsers: vi.fn().mockRejectedValue(new Error('boom')) } as unknown as OmadaClient);
        await expect(handler({}, {})).rejects.toThrow('boom');
    });
});
