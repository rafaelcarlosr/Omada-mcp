import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import type { OmadaClient } from '../omadaClient/index.js';
import { deviceMacSchema, siteInputSchema, toToolResult, wrapToolHandler } from '../server/common.js';

const inputSchema = siteInputSchema.extend({
    switchMac: deviceMacSchema.describe('MAC address of the switch from listDevices.'),
});

type Client = Pick<OmadaClient, 'listSwitchDhcpUsers'>;

export function registerListSwitchDhcpUsersTool(server: McpServer, client: Client): void {
    server.registerTool(
        'listSwitchDhcpUsers',
        {
            description: 'List DHCP users seen by a switch (DHCP L2 relay/snooping). Returns every page.',
            inputSchema: inputSchema.shape,
        },
        wrapToolHandler('listSwitchDhcpUsers', async ({ switchMac, siteId, customHeaders }) =>
            toToolResult(await client.listSwitchDhcpUsers(switchMac, siteId, customHeaders))
        )
    );
}
