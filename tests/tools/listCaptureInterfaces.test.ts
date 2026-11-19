import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { OmadaClient } from '../../src/omadaClient/index.js';
import { registerListCaptureInterfacesTool } from '../../src/tools/listCaptureInterfaces.js';

type Handler = (args: Record<string, unknown>, extra: object) => Promise<{ content: { text: string }[] }>;

describe('tools/listCaptureInterfaces', () => {
    let handler: Handler;
    let client: Record<string, ReturnType<typeof vi.fn>>;

    beforeEach(() => {
        client = { listCaptureInterfaces: vi.fn().mockResolvedValue({ ok: true }) };
        const server = { registerTool: vi.fn((_name, _def, fn) => (handler = fn)) } as unknown as McpServer;
        registerListCaptureInterfacesTool(server, client as unknown as OmadaClient);
    });

    it('registers and returns the controller read', async () => {
        const result = await handler({ deviceType: 'switch', deviceMac: 'AA-BB-CC-DD-EE-01', siteId: 's1' }, {});
        expect(client.listCaptureInterfaces).toHaveBeenCalledWith('switch', 'AA-BB-CC-DD-EE-01', 's1', undefined);
        expect(JSON.parse(result.content[0].text)).toEqual({ ok: true });
    });

    it('propagates read failures', async () => {
        client.listCaptureInterfaces.mockRejectedValueOnce(new Error('boom'));
        await expect(handler({ deviceType: 'switch', deviceMac: 'AA-BB-CC-DD-EE-01', siteId: 's1' }, {})).rejects.toThrow('boom');
    });
});
