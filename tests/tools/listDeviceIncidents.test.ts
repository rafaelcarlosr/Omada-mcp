import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { OmadaClient } from '../../src/omadaClient/index.js';
import { registerListDeviceIncidentsTool } from '../../src/tools/listDeviceIncidents.js';

type Handler = (args: Record<string, unknown>, extra: object) => Promise<{ content: { text: string }[] }>;

describe('tools/listDeviceIncidents', () => {
    let handler: Handler;
    let server: McpServer;
    let client: Record<string, ReturnType<typeof vi.fn>>;

    beforeEach(() => {
        client = { listDeviceIncidents: vi.fn().mockResolvedValue({ ok: true }) };
        server = {
            registerTool: vi.fn((_name, _def, fn) => {
                handler = fn;
            }),
        } as unknown as McpServer;
        registerListDeviceIncidentsTool(server, client as unknown as OmadaClient);
    });

    it('registers and returns the controller read', async () => {
        const result = await handler({ deviceMac: 'AA-BB-CC-DD-EE-01', startTime: 100, endTime: 200, page: 2, pageSize: 5, siteId: 'site-1' }, {});

        expect(server.registerTool).toHaveBeenCalledWith(
            'listDeviceIncidents',
            expect.objectContaining({ description: expect.any(String) }),
            expect.any(Function)
        );
        expect(client.listDeviceIncidents).toHaveBeenCalledWith('AA-BB-CC-DD-EE-01', { startTime: 100, endTime: 200 }, 2, 5, 'site-1', undefined);
        expect(JSON.parse(result.content[0].text)).toEqual({ ok: true });
    });

    it('propagates read failures', async () => {
        client.listDeviceIncidents.mockRejectedValueOnce(new Error('boom'));
        await expect(
            handler({ deviceMac: 'AA-BB-CC-DD-EE-01', startTime: 100, endTime: 200, page: 2, pageSize: 5, siteId: 'site-1' }, {})
        ).rejects.toThrow('boom');
    });
});
