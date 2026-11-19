import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { OmadaClient } from '../../src/omadaClient/index.js';
import { registerListTopologyAvailableSsidsTool } from '../../src/tools/listTopologyAvailableSsids.js';

type Handler = (args: Record<string, unknown>, extra: object) => Promise<{ content: { text: string }[] }>;

describe('tools/listTopologyAvailableSsids', () => {
    let handler: Handler;
    let client: Record<string, ReturnType<typeof vi.fn>>;

    beforeEach(() => {
        client = { listTopologyAvailableSsids: vi.fn().mockResolvedValue([]) };
        const server = { registerTool: vi.fn((_name, _def, fn) => (handler = fn)) } as unknown as McpServer;
        registerListTopologyAvailableSsidsTool(server, client as unknown as OmadaClient);
    });

    it('searches with an empty key by default', async () => {
        await handler({}, {});
        expect(client.listTopologyAvailableSsids).toHaveBeenCalledWith('', undefined, undefined);
        await handler({ searchKey: 'guest', siteId: 's1' }, {});
        expect(client.listTopologyAvailableSsids).toHaveBeenLastCalledWith('guest', 's1', undefined);
    });
});
