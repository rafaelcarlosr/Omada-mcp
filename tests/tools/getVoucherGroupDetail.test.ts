import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { OmadaClient } from '../../src/omadaClient/index.js';
import { registerGetVoucherGroupDetailTool } from '../../src/tools/getVoucherGroupDetail.js';

type Handler = (args: Record<string, unknown>, extra: object) => Promise<{ content: { text: string }[] }>;

describe('tools/getVoucherGroupDetail', () => {
    let handler: Handler;
    let definition: { inputSchema: Record<string, { parse: (value: unknown) => unknown }> };
    let server: McpServer;
    let client: Record<string, ReturnType<typeof vi.fn>>;

    beforeEach(() => {
        client = { getVoucherGroupDetail: vi.fn().mockResolvedValue({ ok: true }) };
        server = {
            registerTool: vi.fn((_name, def, fn) => {
                definition = def;
                handler = fn;
            }),
        } as unknown as McpServer;
        registerGetVoucherGroupDetailTool(server, client as unknown as OmadaClient);
    });

    it('registers and returns the controller read', async () => {
        const result = await handler({ groupId: 'g-1', status: 0, searchKey: '12', page: 2, pageSize: 5, siteId: 'site-1' }, {});

        expect(server.registerTool).toHaveBeenCalledWith(
            'getVoucherGroupDetail',
            expect.objectContaining({ description: expect.any(String) }),
            expect.any(Function)
        );
        expect(client.getVoucherGroupDetail).toHaveBeenCalledWith('g-1', { page: 2, pageSize: 5, status: 0, searchKey: '12' }, 'site-1', undefined);
        expect(JSON.parse(result.content[0].text)).toEqual({ ok: true });
        expect(definition.inputSchema).toBeTruthy();
    });

    it('validates the identifier', () => {
        expect(() => definition.inputSchema.groupId.parse('')).toThrow();
    });

    it('propagates read failures', async () => {
        client.getVoucherGroupDetail.mockRejectedValueOnce(new Error('boom'));
        await expect(handler({ groupId: 'g-1', status: 0, searchKey: '12', page: 2, pageSize: 5, siteId: 'site-1' }, {})).rejects.toThrow('boom');
    });
});
