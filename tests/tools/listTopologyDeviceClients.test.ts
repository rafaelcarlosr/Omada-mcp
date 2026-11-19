import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { OmadaClient } from '../../src/omadaClient/index.js';
import { registerListTopologyDeviceClientsTool } from '../../src/tools/listTopologyDeviceClients.js';

type Handler = (args: Record<string, unknown>, extra: object) => Promise<{ content: { text: string }[] }>;

describe('tools/listTopologyDeviceClients', () => {
    let handler: Handler;
    let client: Record<string, ReturnType<typeof vi.fn>>;

    beforeEach(() => {
        client = { listTopologyDeviceClients: vi.fn().mockResolvedValue(['a']), listTopologyDeviceAllClients: vi.fn().mockResolvedValue(['b']) };
        const server = { registerTool: vi.fn((_name, _def, fn) => (handler = fn)) } as unknown as McpServer;
        registerListTopologyDeviceClientsTool(server, client as unknown as OmadaClient);
    });

    it('lists the device clients without a type filter', async () => {
        const result = await handler({ deviceMac: 'AA-BB-CC-DD-EE-01' }, {});
        expect(client.listTopologyDeviceClients).toHaveBeenCalledWith('AA-BB-CC-DD-EE-01', undefined, undefined);
        expect(JSON.parse(result.content[0].text)).toEqual(['a']);
    });

    it('filters by client type', async () => {
        const result = await handler({ deviceMac: 'AA-BB-CC-DD-EE-01', clientType: '1', siteId: 's1' }, {});
        expect(client.listTopologyDeviceAllClients).toHaveBeenCalledWith('AA-BB-CC-DD-EE-01', '1', 's1', undefined);
        expect(JSON.parse(result.content[0].text)).toEqual(['b']);
    });
});
