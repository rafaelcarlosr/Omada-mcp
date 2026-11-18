import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import type { OmadaClient } from '../omadaClient/index.js';
import { deviceMacSchema, siteInputSchema, toToolResult, wrapToolHandler } from '../server/common.js';

const inputSchema = siteInputSchema.extend({
    switchMac: deviceMacSchema.describe('MAC address of the switch from listDevices.'),
});

type Client = Pick<OmadaClient, 'listSwitchPortLagNetworks'>;

export function registerListSwitchPortLagNetworksTool(server: McpServer, client: Client): void {
    server.registerTool(
        'listSwitchPortLagNetworks',
        {
            description: "List the networks (VLANs) used on a switch's ports and LAGs. Returns every page.",
            inputSchema: inputSchema.shape,
        },
        wrapToolHandler('listSwitchPortLagNetworks', async ({ switchMac, siteId, customHeaders }) =>
            toToolResult(await client.listSwitchPortLagNetworks(switchMac, siteId, customHeaders))
        )
    );
}
