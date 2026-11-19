import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { OmadaClient } from '../../src/omadaClient/index.js';
import { registerListSiteTemplateAllModulesTool } from '../../src/tools/listSiteTemplateAllModules.js';

type Handler = (args: Record<string, unknown>, extra: object) => Promise<{ content: { text: string }[] }>;

describe('tools/listSiteTemplateAllModules', () => {
    let handler: Handler;
    let client: Record<string, ReturnType<typeof vi.fn>>;

    beforeEach(() => {
        client = { listSiteTemplateAllModules: vi.fn().mockResolvedValue({ ok: true }) };
        const server = { registerTool: vi.fn((_name, _def, fn) => (handler = fn)) } as unknown as McpServer;
        registerListSiteTemplateAllModulesTool(server, client as unknown as OmadaClient);
    });

    it('registers and returns the controller read', async () => {
        const result = await handler({}, {});
        expect(client.listSiteTemplateAllModules).toHaveBeenCalledWith(undefined);
        expect(JSON.parse(result.content[0].text)).toEqual({ ok: true });
    });

    it('propagates read failures', async () => {
        client.listSiteTemplateAllModules.mockRejectedValueOnce(new Error('boom'));
        await expect(handler({}, {})).rejects.toThrow('boom');
    });
});
