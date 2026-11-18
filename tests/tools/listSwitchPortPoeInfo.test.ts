import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { OmadaClient } from '../../src/omadaClient/index.js';
import { registerListSwitchPortPoeInfoTool } from '../../src/tools/listSwitchPortPoeInfo.js';

type Handler = (
    args: Record<string, unknown>,
    extra: object
) => Promise<{ structuredContent?: Record<string, unknown>; content: { text: string }[] }>;

describe('tools/listSwitchPortPoeInfo', () => {
    let handler: Handler;
    let server: McpServer;
    let client: Record<string, ReturnType<typeof vi.fn>>;

    beforeEach(() => {
        client = { listSwitchPortPoeInfo: vi.fn().mockResolvedValue([{ port: 1, name: 'Port1' }]) };
        server = { registerTool: vi.fn((_name, _def, fn) => (handler = fn)) } as unknown as McpServer;
        registerListSwitchPortPoeInfoTool(server, client as unknown as OmadaClient);
    });

    it('registers and returns the controller read', async () => {
        const result = await handler({ siteId: 'site-1' }, {});

        expect(server.registerTool).toHaveBeenCalledWith(
            'listSwitchPortPoeInfo',
            expect.objectContaining({ description: expect.any(String) }),
            expect.any(Function)
        );
        expect(client.listSwitchPortPoeInfo).toHaveBeenCalledWith('site-1', undefined);
        expect(JSON.parse(result.content[0].text)).toEqual([{ port: 1, name: 'Port1' }]);
    });

    it('propagates read failures', async () => {
        client.listSwitchPortPoeInfo.mockRejectedValueOnce(new Error('boom'));
        await expect(handler({}, {})).rejects.toThrow('boom');
    });
});
