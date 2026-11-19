import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { OmadaClient } from '../../src/omadaClient/index.js';
import { registerListSwitchOuiSupportedSwitchesTool } from '../../src/tools/listSwitchOuiSupportedSwitches.js';

type Handler = (args: Record<string, unknown>, extra: object) => Promise<{ content: { text: string }[] }>;

describe('tools/listSwitchOuiSupportedSwitches', () => {
    let handler: Handler;
    let server: McpServer;
    let client: Record<string, ReturnType<typeof vi.fn>>;

    beforeEach(() => {
        client = { listSwitchOuiSupportedSwitches: vi.fn().mockResolvedValue({ ok: true }) };
        server = {
            registerTool: vi.fn((_name, _def, fn) => {
                handler = fn;
            }),
        } as unknown as McpServer;
        registerListSwitchOuiSupportedSwitchesTool(server, client as unknown as OmadaClient);
    });

    it('registers and returns the controller read', async () => {
        const result = await handler({ page: 2, pageSize: 5, siteId: 'site-1' }, {});

        expect(server.registerTool).toHaveBeenCalledWith(
            'listSwitchOuiSupportedSwitches',
            expect.objectContaining({ description: expect.any(String) }),
            expect.any(Function)
        );
        expect(client.listSwitchOuiSupportedSwitches).toHaveBeenCalledWith(2, 5, 'site-1', undefined);
        expect(JSON.parse(result.content[0].text)).toEqual({ ok: true });
    });

    it('defaults to the first page of ten', async () => {
        await handler({}, {});
        expect(client.listSwitchOuiSupportedSwitches).toHaveBeenCalledWith(1, 10, undefined, undefined);
    });

    it('propagates read failures', async () => {
        client.listSwitchOuiSupportedSwitches.mockRejectedValueOnce(new Error('boom'));
        await expect(handler({}, {})).rejects.toThrow('boom');
    });
});
