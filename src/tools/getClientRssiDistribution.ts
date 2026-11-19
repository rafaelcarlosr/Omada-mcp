import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import type { OmadaClient } from '../omadaClient/index.js';
import { siteInputSchema, toToolResult, wrapToolHandler } from '../server/common.js';

type Client = Pick<OmadaClient, 'getClientRssiDistribution'>;

export function registerGetClientRssiDistributionTool(server: McpServer, client: Client): void {
    server.registerTool(
        'getClientRssiDistribution',
        {
            description: 'Get how wireless clients are spread over RSSI ranges, per band.',
            inputSchema: siteInputSchema.shape,
        },
        wrapToolHandler('getClientRssiDistribution', async ({ siteId, customHeaders }) =>
            toToolResult(await client.getClientRssiDistribution(siteId, customHeaders))
        )
    );
}
