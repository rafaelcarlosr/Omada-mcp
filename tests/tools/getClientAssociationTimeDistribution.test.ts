import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { OmadaClient } from '../../src/omadaClient/index.js';
import { registerGetClientAssociationTimeDistributionTool } from '../../src/tools/getClientAssociationTimeDistribution.js';

type Handler = (args: Record<string, unknown>, extra: object) => Promise<{ content: { text: string }[] }>;

describe('tools/getClientAssociationTimeDistribution', () => {
    let handler: Handler;
    let server: McpServer;
    let client: Record<string, ReturnType<typeof vi.fn>>;

    beforeEach(() => {
        client = { getClientAssociationTimeDistribution: vi.fn().mockResolvedValue({ ok: true }) };
        server = {
            registerTool: vi.fn((_name, _def, fn) => {
                handler = fn;
            }),
        } as unknown as McpServer;
        registerGetClientAssociationTimeDistributionTool(server, client as unknown as OmadaClient);
    });

    it('registers and returns the controller read', async () => {
        const result = await handler({ start: 100, end: 200, siteId: 'site-1' }, {});

        expect(server.registerTool).toHaveBeenCalledWith(
            'getClientAssociationTimeDistribution',
            expect.objectContaining({ description: expect.any(String) }),
            expect.any(Function)
        );
        expect(client.getClientAssociationTimeDistribution).toHaveBeenCalledWith({ start: 100, end: 200 }, 'site-1', undefined);
        expect(JSON.parse(result.content[0].text)).toEqual({ ok: true });
    });

    it('propagates read failures', async () => {
        client.getClientAssociationTimeDistribution.mockRejectedValueOnce(new Error('boom'));
        await expect(handler({ start: 100, end: 200, siteId: 'site-1' }, {})).rejects.toThrow('boom');
    });
});
