import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { OmadaClient } from '../../src/omadaClient/index.js';
import { registerListUnplacedSitePositionsTool } from '../../src/tools/listUnplacedSitePositions.js';

type Handler = (args: Record<string, unknown>, extra: object) => Promise<{ content: { text: string }[] }>;

describe('tools/listUnplacedSitePositions', () => {
    let handler: Handler;
    let definition: { inputSchema: Record<string, { parse: (value: unknown) => unknown }> };
    let server: McpServer;
    let client: Record<string, ReturnType<typeof vi.fn>>;

    beforeEach(() => {
        client = { listUnplacedSitePositions: vi.fn().mockResolvedValue({ ok: true }) };
        server = {
            registerTool: vi.fn((_name, def, fn) => {
                definition = def;
                handler = fn;
            }),
        } as unknown as McpServer;
        registerListUnplacedSitePositionsTool(server, client as unknown as OmadaClient);
    });

    it('registers and returns the controller read', async () => {
        const result = await handler({ page: 2, pageSize: 5, searchKey: 'lab' }, {});

        expect(server.registerTool).toHaveBeenCalledWith(
            'listUnplacedSitePositions',
            expect.objectContaining({ description: expect.any(String) }),
            expect.any(Function)
        );
        expect(client.listUnplacedSitePositions).toHaveBeenCalledWith(2, 5, 'lab', undefined);
        expect(JSON.parse(result.content[0].text)).toEqual({ ok: true });
        expect(definition.inputSchema).toBeTruthy();
    });

    it('defaults to the first page of ten', async () => {
        await handler({}, {});
        expect(client.listUnplacedSitePositions).toHaveBeenCalledWith(1, 10, undefined, undefined);
    });

    it('propagates read failures', async () => {
        client.listUnplacedSitePositions.mockRejectedValueOnce(new Error('boom'));
        await expect(handler({ page: 2, pageSize: 5, searchKey: 'lab' }, {})).rejects.toThrow('boom');
    });
});
