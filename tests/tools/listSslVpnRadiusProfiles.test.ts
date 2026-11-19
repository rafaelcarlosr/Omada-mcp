import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { OmadaClient } from '../../src/omadaClient/index.js';
import { registerListSslVpnRadiusProfilesTool } from '../../src/tools/listSslVpnRadiusProfiles.js';

type Handler = (args: Record<string, unknown>, extra: object) => Promise<{ content: { text: string }[] }>;

describe('tools/listSslVpnRadiusProfiles', () => {
    let handler: Handler;
    let client: Record<string, ReturnType<typeof vi.fn>>;

    beforeEach(() => {
        client = { listSslVpnRadiusProfiles: vi.fn().mockResolvedValue({ ok: true }) };
        const server = { registerTool: vi.fn((_name, _def, fn) => (handler = fn)) } as unknown as McpServer;
        registerListSslVpnRadiusProfilesTool(server, client as unknown as OmadaClient);
    });

    it('registers and returns the controller read', async () => {
        const result = await handler({ siteId: 's1' }, {});
        expect(client.listSslVpnRadiusProfiles).toHaveBeenCalledWith('s1', undefined);
        expect(JSON.parse(result.content[0].text)).toEqual({ ok: true });
    });

    it('propagates read failures', async () => {
        client.listSslVpnRadiusProfiles.mockRejectedValueOnce(new Error('boom'));
        await expect(handler({ siteId: 's1' }, {})).rejects.toThrow('boom');
    });
});
