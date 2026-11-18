import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import type { OmadaClient } from '../omadaClient/index.js';
import { deviceMacSchema, siteInputSchema, toToolResult, wrapToolHandler } from '../server/common.js';

const inputSchema = siteInputSchema.extend({
    apMac: deviceMacSchema.describe('MAC address of the access point from listDevices.'),
});

type Client = Pick<OmadaClient, 'getApLagConfig'>;

export function registerGetApLagConfigTool(server: McpServer, client: Client): void {
    server.registerTool(
        'getApLagConfig',
        {
            description: 'Get the LAG (link aggregation of the AP uplinks) setting of an access point, or whether it is unsupported.',
            inputSchema: inputSchema.shape,
        },
        wrapToolHandler('getApLagConfig', async ({ apMac, siteId, customHeaders }) =>
            toToolResult(await client.getApLagConfig(apMac, siteId, customHeaders))
        )
    );
}
