import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import type { OmadaClient } from '../omadaClient/index.js';
import { deviceMacSchema, siteInputSchema, toToolResult, wrapToolHandler } from '../server/common.js';

const inputSchema = siteInputSchema.extend({
    switchMac: deviceMacSchema.describe('MAC address of the switch from listDevices.'),
});

type Client = Pick<OmadaClient, 'listSwitchNetworksDetail'>;

export function registerListSwitchNetworksDetailTool(server: McpServer, client: Client): void {
    server.registerTool(
        'listSwitchNetworksDetail',
        {
            description: 'List each network on a switch with the native, tagged and untagged ports and LAGs it uses. Returns every page.',
            inputSchema: inputSchema.shape,
        },
        wrapToolHandler('listSwitchNetworksDetail', async ({ switchMac, siteId, customHeaders }) =>
            toToolResult(await client.listSwitchNetworksDetail(switchMac, siteId, customHeaders))
        )
    );
}
