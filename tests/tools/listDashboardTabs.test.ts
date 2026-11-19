import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { OmadaClient } from '../../src/omadaClient/index.js';
import { registerListDashboardTabsTool } from '../../src/tools/listDashboardTabs.js';

type Handler = (args: Record<string, unknown>, extra: object) => Promise<{ content: { text: string }[] }>;

describe('tools/listDashboardTabs', () => {
    let handler: Handler;
    let server: McpServer;
    let client: Record<string, ReturnType<typeof vi.fn>>;

    beforeEach(() => {
        client = { listDashboardTabs: vi.fn().mockResolvedValue({ ok: true }) };
        server = {
            registerTool: vi.fn((_name, _def, fn) => {
                handler = fn;
            }),
        } as unknown as McpServer;
        registerListDashboardTabsTool(server, client as unknown as OmadaClient);
    });

    it('registers and returns the controller read', async () => {
        const result = await handler({ siteId: 'site-1' }, {});

        expect(server.registerTool).toHaveBeenCalledWith(
            'listDashboardTabs',
            expect.objectContaining({ description: expect.any(String) }),
            expect.any(Function)
        );
        expect(client.listDashboardTabs).toHaveBeenCalledWith('site-1', undefined);
        expect(JSON.parse(result.content[0].text)).toEqual({ ok: true });
    });

    it('propagates read failures', async () => {
        client.listDashboardTabs.mockRejectedValueOnce(new Error('boom'));
        await expect(handler({ siteId: 'site-1' }, {})).rejects.toThrow('boom');
    });
});
