import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import type { OmadaClient } from '../omadaClient/index.js';
import { deviceMacSchema, siteInputSchema, toToolResult, wrapToolHandler } from '../server/common.js';

const inputSchema = siteInputSchema.extend({
    switchMac: deviceMacSchema.describe('MAC address of the switch from listDevices.'),
});

type Client = Pick<OmadaClient, 'listSwitchLldpNeighbors'>;

export function registerListSwitchLldpNeighborsTool(server: McpServer, client: Client): void {
    server.registerTool(
        'listSwitchLldpNeighbors',
        {
            description:
                'List the LLDP neighbors a switch sees on each port (device, system name, remote port and capabilities); useful to find uplinks and APs. Returns every page.',
            inputSchema: inputSchema.shape,
        },
        wrapToolHandler('listSwitchLldpNeighbors', async ({ switchMac, siteId, customHeaders }) =>
            toToolResult(await client.listSwitchLldpNeighbors(switchMac, siteId, customHeaders))
        )
    );
}
