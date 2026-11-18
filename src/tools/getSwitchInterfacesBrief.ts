import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import type { OmadaClient } from '../omadaClient/index.js';
import { deviceMacSchema, siteInputSchema, toToolResult, wrapToolHandler } from '../server/common.js';

const inputSchema = siteInputSchema.extend({
    switchMac: deviceMacSchema.describe('MAC address of the switch from listDevices.'),
});

type Client = Pick<OmadaClient, 'getSwitchInterfacesBrief'>;

export function registerGetSwitchInterfacesBriefTool(server: McpServer, client: Client): void {
    server.registerTool(
        'getSwitchInterfacesBrief',
        {
            description: "Get the brief list of a switch's VLAN interfaces (ID and name).",
            inputSchema: inputSchema.shape,
        },
        wrapToolHandler('getSwitchInterfacesBrief', async ({ switchMac, siteId, customHeaders }) =>
            toToolResult(await client.getSwitchInterfacesBrief(switchMac, siteId, customHeaders))
        )
    );
}
