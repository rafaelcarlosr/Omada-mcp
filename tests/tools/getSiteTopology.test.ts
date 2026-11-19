import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { OmadaClient } from '../../src/omadaClient/index.js';
import { registerGetSiteTopologyTool } from '../../src/tools/getSiteTopology.js';

type Handler = (args: Record<string, unknown>, extra: object) => Promise<{ content: { text: string }[] }>;

describe('tools/getSiteTopology', () => {
    let handler: Handler;
    let client: Record<string, ReturnType<typeof vi.fn>>;

    beforeEach(() => {
        client = { getSiteTopology: vi.fn().mockResolvedValue({ v: 2 }), getSiteTopologyByStatus: vi.fn().mockResolvedValue({ v: 3 }) };
        const server = { registerTool: vi.fn((_name, _def, fn) => (handler = fn)) } as unknown as McpServer;
        registerGetSiteTopologyTool(server, client as unknown as OmadaClient);
    });

    it('uses the v2 topology without a status filter', async () => {
        const result = await handler({ siteId: 's1' }, {});
        expect(client.getSiteTopology).toHaveBeenCalledWith('s1', undefined);
        expect(JSON.parse(result.content[0].text)).toEqual({ v: 2 });
    });

    it('uses the v3 topology with a status filter', async () => {
        const result = await handler({ deviceStatus: '0,1' }, {});
        expect(client.getSiteTopologyByStatus).toHaveBeenCalledWith('0,1', undefined, undefined);
        expect(JSON.parse(result.content[0].text)).toEqual({ v: 3 });
    });
});
