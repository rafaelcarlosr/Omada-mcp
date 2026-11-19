import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { OmadaClient } from '../../src/omadaClient/index.js';
import { registerListSitesAvailableForTemplateTool } from '../../src/tools/listSitesAvailableForTemplate.js';

type Handler = (args: Record<string, unknown>, extra: object) => Promise<{ content: { text: string }[] }>;

describe('tools/listSitesAvailableForTemplate', () => {
    let handler: Handler;
    let client: Record<string, ReturnType<typeof vi.fn>>;

    beforeEach(() => {
        client = { listSitesAvailableForTemplate: vi.fn().mockResolvedValue({ ok: true }) };
        const server = { registerTool: vi.fn((_name, _def, fn) => (handler = fn)) } as unknown as McpServer;
        registerListSitesAvailableForTemplateTool(server, client as unknown as OmadaClient);
    });

    it('registers and returns the controller read', async () => {
        const result = await handler({ siteTemplateId: 't-1', searchKey: 'lab', page: 2, pageSize: 5 }, {});
        expect(client.listSitesAvailableForTemplate).toHaveBeenCalledWith('t-1', 2, 5, 'lab', undefined);
        expect(JSON.parse(result.content[0].text)).toEqual({ ok: true });
    });

    it('propagates read failures', async () => {
        client.listSitesAvailableForTemplate.mockRejectedValueOnce(new Error('boom'));
        await expect(handler({ siteTemplateId: 't-1', searchKey: 'lab', page: 2, pageSize: 5 }, {})).rejects.toThrow('boom');
    });
});
