import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { describe, expect, it, vi } from 'vitest';

import type { OmadaClient } from '../../src/omadaClient/index.js';
import { registerGetVoucherSummaryTool } from '../../src/tools/getVoucherSummary.js';

type Handler = (
    args: Record<string, unknown>,
    extra: object
) => Promise<{ structuredContent?: Record<string, unknown>; content: { text: string }[] }>;

describe('tools/getVoucherSummary', () => {
    it('registers and returns the controller read', async () => {
        let handler: Handler = async () => ({ content: [] });
        const server = { registerTool: vi.fn((_name, _def, fn) => (handler = fn)) } as unknown as McpServer;
        const client = { getVoucherSummary: vi.fn().mockResolvedValue({ current: { count: 0 } }) };
        registerGetVoucherSummaryTool(server, client as unknown as OmadaClient);

        const result = await handler({ siteId: 'site-1' }, {});

        expect(server.registerTool).toHaveBeenCalledWith(
            'getVoucherSummary',
            expect.objectContaining({ description: expect.any(String) }),
            expect.any(Function)
        );
        expect(client.getVoucherSummary).toHaveBeenCalledWith('site-1', undefined);
        expect(result.structuredContent).toEqual({ current: { count: 0 } });
    });

    it('propagates read failures', async () => {
        let handler: Handler = async () => ({ content: [] });
        const server = { registerTool: vi.fn((_name, _def, fn) => (handler = fn)) } as unknown as McpServer;
        registerGetVoucherSummaryTool(server, { getVoucherSummary: vi.fn().mockRejectedValue(new Error('boom')) } as unknown as OmadaClient);
        await expect(handler({}, {})).rejects.toThrow('boom');
    });
});
