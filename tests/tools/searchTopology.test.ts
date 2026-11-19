import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { OmadaClient } from '../../src/omadaClient/index.js';
import { registerSearchTopologyTool } from '../../src/tools/searchTopology.js';

type Handler = (args: Record<string, unknown>, extra: object) => Promise<{ content: { text: string }[] }>;

describe('tools/searchTopology', () => {
    let handler: Handler;
    let client: Record<string, ReturnType<typeof vi.fn>>;

    beforeEach(() => {
        client = { searchTopology: vi.fn().mockResolvedValue({ ok: true }) };
        const server = { registerTool: vi.fn((_name, _def, fn) => (handler = fn)) } as unknown as McpServer;
        registerSearchTopologyTool(server, client as unknown as OmadaClient);
    });

    it('registers and returns the controller read', async () => {
        const result = await handler({ searchKey: 'ap', siteId: 's1' }, {});
        expect(client.searchTopology).toHaveBeenCalledWith('ap', 's1', undefined);
        expect(JSON.parse(result.content[0].text)).toEqual({ ok: true });
    });

    it('propagates read failures', async () => {
        client.searchTopology.mockRejectedValueOnce(new Error('boom'));
        await expect(handler({ searchKey: 'ap', siteId: 's1' }, {})).rejects.toThrow('boom');
    });
});
