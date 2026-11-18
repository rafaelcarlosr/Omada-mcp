import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import type { OmadaClient } from '../omadaClient/index.js';
import { deviceMacSchema, siteInputSchema, toToolResult, wrapToolHandler } from '../server/common.js';

const inputSchema = siteInputSchema.extend({
    switchMac: deviceMacSchema.describe('MAC address of the switch from listDevices.'),
});

type Client = Pick<OmadaClient, 'getSwitchExistingNetworks'>;

export function registerGetSwitchExistingNetworksTool(server: McpServer, client: Client): void {
    server.registerTool(
        'getSwitchExistingNetworks',
        {
            description: 'Get the networks that exist on a switch (ID, name, VLAN).',
            inputSchema: inputSchema.shape,
        },
        wrapToolHandler('getSwitchExistingNetworks', async ({ switchMac, siteId, customHeaders }) =>
            toToolResult(await client.getSwitchExistingNetworks(switchMac, siteId, customHeaders))
        )
    );
}
