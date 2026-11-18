import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import type { OmadaClient } from '../omadaClient/index.js';
import { deviceMacSchema, siteInputSchema, toToolResult, wrapToolHandler } from '../server/common.js';

const inputSchema = siteInputSchema.extend({
    switchMac: deviceMacSchema.describe('MAC address of the switch from listDevices.'),
});

type Client = Pick<OmadaClient, 'listSwitchInterfaces'>;

export function registerListSwitchInterfacesTool(server: McpServer, client: Client): void {
    server.registerTool(
        'listSwitchInterfaces',
        {
            description: 'List the VLAN interfaces of a switch with their addressing and status. Returns every page.',
            inputSchema: inputSchema.shape,
        },
        wrapToolHandler('listSwitchInterfaces', async ({ switchMac, siteId, customHeaders }) =>
            toToolResult(await client.listSwitchInterfaces(switchMac, siteId, customHeaders))
        )
    );
}
