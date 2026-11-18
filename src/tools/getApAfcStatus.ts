import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import type { OmadaClient } from '../omadaClient/index.js';
import { deviceMacSchema, siteInputSchema, toToolResult, wrapToolHandler } from '../server/common.js';

const inputSchema = siteInputSchema.extend({
    apMac: deviceMacSchema.describe('MAC address of the access point from listDevices.'),
});

type Client = Pick<OmadaClient, 'getApAfcStatus'>;

export function registerGetApAfcStatusTool(server: McpServer, client: Client): void {
    server.registerTool(
        'getApAfcStatus',
        {
            description: 'Get the AFC (automated frequency coordination, 6 GHz standard power) status of an access point.',
            inputSchema: inputSchema.shape,
        },
        wrapToolHandler('getApAfcStatus', async ({ apMac, siteId, customHeaders }) =>
            toToolResult(await client.getApAfcStatus(apMac, siteId, customHeaders))
        )
    );
}
