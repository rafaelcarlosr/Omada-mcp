import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import type { OmadaClient } from '../omadaClient/index.js';
import { siteInputSchema, toToolResult, wrapToolHandler } from '../server/common.js';

const inputSchema = siteInputSchema.extend({
    networkId: z.string().trim().min(1).describe('Network ID from getTopologyAvailableVlans.'),
    vlan: z.number().int().min(1).max(4094).describe('VLAN ID.'),
});

type Client = Pick<OmadaClient, 'listTopologyVlanDevices'>;

export function registerListTopologyVlanDevicesTool(server: McpServer, client: Client): void {
    server.registerTool(
        'listTopologyVlanDevices',
        {
            description: 'List the MACs of the devices that carry one VLAN.',
            inputSchema: inputSchema.shape,
        },
        wrapToolHandler('listTopologyVlanDevices', async ({ networkId, vlan, siteId, customHeaders }) =>
            toToolResult(await client.listTopologyVlanDevices(networkId, vlan, siteId, customHeaders))
        )
    );
}
