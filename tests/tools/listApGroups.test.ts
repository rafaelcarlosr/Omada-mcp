import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { OmadaClient } from '../../src/omadaClient/index.js';
import { registerListApGroupsTool } from '../../src/tools/listApGroups.js';

type Handler = (args: Record<string, unknown>, extra: object) => Promise<{ content: { text: string }[] }>;

describe('tools/listApGroups', () => {
    let handler: Handler;
    let client: Record<string, ReturnType<typeof vi.fn>>;

    beforeEach(() => {
        client = { listApGroups: vi.fn().mockResolvedValue([{ id: 'g0', name: 'Default' }, { id: 'g1', name: 'Lobby' }, { id: 'g2' }]) };
        const server = { registerTool: vi.fn((_name, _def, fn) => (handler = fn)) } as unknown as McpServer;
        registerListApGroupsTool(server, client as unknown as OmadaClient);
    });

    it('lists every AP group of the site', async () => {
        const result = await handler({ siteId: 's1' }, {});
        expect(client.listApGroups).toHaveBeenCalledWith('s1', undefined);
        expect(JSON.parse(result.content[0].text)).toHaveLength(3);
    });

    it('filters by name, ignoring case', async () => {
        const result = await handler({ searchKey: 'lOB' }, {});
        expect(JSON.parse(result.content[0].text)).toEqual([{ id: 'g1', name: 'Lobby' }]);
    });
});
