import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import type { OmadaClient } from '../omadaClient/index.js';
import { siteInputSchema, toToolResult, wrapToolHandler } from '../server/common.js';

const inputSchema = siteInputSchema.extend({
    networkId: z.string().trim().min(1).describe('Network ID from getLanNetworkList or listAllLanNetworks.'),
});

type Client = Pick<OmadaClient, 'getLanNetwork'>;

export function registerGetLanNetworkTool(server: McpServer, client: Client): void {
    server.registerTool(
        'getLanNetwork',
        {
            description: 'Get one LAN network: purpose, VLAN, gateway subnet, DHCP server and options.',
            inputSchema: inputSchema.shape,
        },
        wrapToolHandler('getLanNetwork', async ({ networkId, siteId, customHeaders }) =>
            toToolResult(await client.getLanNetwork(networkId, siteId, customHeaders))
        )
    );
}
