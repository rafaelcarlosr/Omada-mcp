import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { OmadaClient } from '../../src/omadaClient/index.js';
import { registerListDhcpClientsTool } from '../../src/tools/listDhcpClients.js';

type Handler = (args: Record<string, unknown>, extra: object) => Promise<{ content: { text: string }[] }>;

describe('tools/listDhcpClients', () => {
    let handler: Handler;
    let client: Record<string, ReturnType<typeof vi.fn>>;

    beforeEach(() => {
        client = {
            listDhcpClients: vi.fn().mockResolvedValue([
                { mac: 'AA-BB', ip: '10.0.0.5', name: 'Printer' },
                { mac: 'CC-DD', ip: '10.0.0.6' },
            ]),
        };
        const server = { registerTool: vi.fn((_name, _def, fn) => (handler = fn)) } as unknown as McpServer;
        registerListDhcpClientsTool(server, client as unknown as OmadaClient);
    });

    it('lists every lease', async () => {
        const result = await handler({ siteId: 's1' }, {});
        expect(client.listDhcpClients).toHaveBeenCalledWith('s1', undefined);
        expect(JSON.parse(result.content[0].text)).toHaveLength(2);
    });

    it('filters leases by text, ignoring case', async () => {
        const result = await handler({ searchKey: 'printer' }, {});
        expect(JSON.parse(result.content[0].text)).toEqual([{ mac: 'AA-BB', ip: '10.0.0.5', name: 'Printer' }]);
    });
});
