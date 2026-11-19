import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { OmadaClient } from '../../src/omadaClient/index.js';
import { registerListVpnServerUsersTool } from '../../src/tools/listVpnServerUsers.js';

type Handler = (args: Record<string, unknown>, extra: object) => Promise<{ content: { text: string }[] }>;

describe('tools/listVpnServerUsers', () => {
    let handler: Handler;
    let client: Record<string, ReturnType<typeof vi.fn>>;

    beforeEach(() => {
        client = { listVpnServerUsers: vi.fn().mockResolvedValue({ ok: true }) };
        const server = { registerTool: vi.fn((_name, _def, fn) => (handler = fn)) } as unknown as McpServer;
        registerListVpnServerUsersTool(server, client as unknown as OmadaClient);
    });

    it('registers and returns the controller read', async () => {
        const result = await handler({ vpnId: 'v1', siteId: 's1' }, {});
        expect(client.listVpnServerUsers).toHaveBeenCalledWith('v1', 's1', undefined);
        expect(JSON.parse(result.content[0].text)).toEqual({ ok: true });
    });

    it('propagates read failures', async () => {
        client.listVpnServerUsers.mockRejectedValueOnce(new Error('boom'));
        await expect(handler({ vpnId: 'v1', siteId: 's1' }, {})).rejects.toThrow('boom');
    });
});
