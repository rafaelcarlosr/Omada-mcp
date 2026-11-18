import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import type { OmadaClient } from '../omadaClient/index.js';
import { deviceMacSchema, siteInputSchema, toToolResult, wrapToolHandler } from '../server/common.js';

const inputSchema = siteInputSchema.extend({
    apMac: deviceMacSchema.describe('MAC address of the access point from listDevices.'),
});

type Client = Pick<OmadaClient, 'getApL3Access'>;

export function registerGetApL3AccessTool(server: McpServer, client: Client): void {
    server.registerTool(
        'getApL3Access',
        {
            description: 'Get the L3 access (manage the AP across subnets) setting of an access point.',
            inputSchema: inputSchema.shape,
        },
        wrapToolHandler('getApL3Access', async ({ apMac, siteId, customHeaders }) =>
            toToolResult(await client.getApL3Access(apMac, siteId, customHeaders))
        )
    );
}
