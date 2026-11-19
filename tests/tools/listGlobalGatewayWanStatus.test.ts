import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { OmadaClient } from '../../src/omadaClient/index.js';
import { registerListGlobalGatewayWanStatusTool } from '../../src/tools/listGlobalGatewayWanStatus.js';

type Handler = (args: Record<string, unknown>, extra: object) => Promise<{ content: { text: string }[] }>;

describe('tools/listGlobalGatewayWanStatus', () => {
    let handler: Handler;
    let server: McpServer;
    let client: Record<string, ReturnType<typeof vi.fn>>;

    beforeEach(() => {
        client = { listGlobalGatewayWanStatus: vi.fn().mockResolvedValue({ ok: true }) };
        server = {
            registerTool: vi.fn((_name, _def, fn) => {
                handler = fn;
            }),
        } as unknown as McpServer;
        registerListGlobalGatewayWanStatusTool(server, client as unknown as OmadaClient);
    });

    it('registers and returns the controller read', async () => {
        const result = await handler({ page: 2, pageSize: 5 }, {});

        expect(server.registerTool).toHaveBeenCalledWith(
            'listGlobalGatewayWanStatus',
            expect.objectContaining({ description: expect.any(String) }),
            expect.any(Function)
        );
        expect(client.listGlobalGatewayWanStatus).toHaveBeenCalledWith(2, 5, undefined);
        expect(JSON.parse(result.content[0].text)).toEqual({ ok: true });
    });

    it('defaults to the first page of ten', async () => {
        await handler({}, {});
        expect(client.listGlobalGatewayWanStatus).toHaveBeenCalledWith(1, 10, undefined);
    });

    it('propagates read failures', async () => {
        client.listGlobalGatewayWanStatus.mockRejectedValueOnce(new Error('boom'));
        await expect(handler({ page: 2, pageSize: 5 }, {})).rejects.toThrow('boom');
    });
});
