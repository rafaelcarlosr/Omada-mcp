import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { OmadaClient } from '../../src/omadaClient/index.js';
import { registerGetSiteTemplateCapacityTool } from '../../src/tools/getSiteTemplateCapacity.js';

type Handler = (args: Record<string, unknown>, extra: object) => Promise<{ content: { text: string }[] }>;

describe('tools/getSiteTemplateCapacity', () => {
    let handler: Handler;
    let client: Record<string, ReturnType<typeof vi.fn>>;

    beforeEach(() => {
        client = { getSiteTemplateCapacity: vi.fn().mockResolvedValue({ ok: true }) };
        const server = { registerTool: vi.fn((_name, _def, fn) => (handler = fn)) } as unknown as McpServer;
        registerGetSiteTemplateCapacityTool(server, client as unknown as OmadaClient);
    });

    it('registers and returns the controller read', async () => {
        const result = await handler({ siteTemplateId: 't-1' }, {});
        expect(client.getSiteTemplateCapacity).toHaveBeenCalledWith('t-1', undefined);
        expect(JSON.parse(result.content[0].text)).toEqual({ ok: true });
    });

    it('propagates read failures', async () => {
        client.getSiteTemplateCapacity.mockRejectedValueOnce(new Error('boom'));
        await expect(handler({ siteTemplateId: 't-1' }, {})).rejects.toThrow('boom');
    });
});
