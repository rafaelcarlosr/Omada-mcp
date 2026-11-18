import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import type { OmadaClient } from '../omadaClient/index.js';
import { deviceMacSchema, siteInputSchema, toToolResult, wrapToolHandler } from '../server/common.js';

const inputSchema = siteInputSchema.extend({
    apMac: deviceMacSchema.describe('MAC address of the access point from listDevices.'),
});

type Client = Pick<OmadaClient, 'listApPortVlans'>;

export function registerListApPortVlansTool(server: McpServer, client: Client): void {
    server.registerTool(
        'listApPortVlans',
        {
            description: 'List the VLANs currently configured on the LAN ports of an access point. Returns every page.',
            inputSchema: inputSchema.shape,
        },
        wrapToolHandler('listApPortVlans', async ({ apMac, siteId, customHeaders }) =>
            toToolResult(await client.listApPortVlans(apMac, siteId, customHeaders))
        )
    );
}
