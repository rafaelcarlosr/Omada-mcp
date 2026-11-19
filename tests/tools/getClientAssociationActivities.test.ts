import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { OmadaClient } from '../../src/omadaClient/index.js';
import { registerGetClientAssociationActivitiesTool } from '../../src/tools/getClientAssociationActivities.js';

type Handler = (args: Record<string, unknown>, extra: object) => Promise<{ content: { text: string }[] }>;

describe('tools/getClientAssociationActivities', () => {
    let handler: Handler;
    let server: McpServer;
    let client: Record<string, ReturnType<typeof vi.fn>>;

    beforeEach(() => {
        client = { getClientAssociationActivities: vi.fn().mockResolvedValue({ ok: true }) };
        server = {
            registerTool: vi.fn((_name, _def, fn) => {
                handler = fn;
            }),
        } as unknown as McpServer;
        registerGetClientAssociationActivitiesTool(server, client as unknown as OmadaClient);
    });

    it('registers and returns the controller read', async () => {
        const result = await handler({ start: 100, end: 200, siteId: 'site-1' }, {});

        expect(server.registerTool).toHaveBeenCalledWith(
            'getClientAssociationActivities',
            expect.objectContaining({ description: expect.any(String) }),
            expect.any(Function)
        );
        expect(client.getClientAssociationActivities).toHaveBeenCalledWith({ start: 100, end: 200 }, 'site-1', undefined);
        expect(JSON.parse(result.content[0].text)).toEqual({ ok: true });
    });

    it('propagates read failures', async () => {
        client.getClientAssociationActivities.mockRejectedValueOnce(new Error('boom'));
        await expect(handler({ start: 100, end: 200, siteId: 'site-1' }, {})).rejects.toThrow('boom');
    });
});
