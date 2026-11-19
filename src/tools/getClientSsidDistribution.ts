import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import type { OmadaClient } from '../omadaClient/index.js';
import { siteInputSchema, toToolResult, wrapToolHandler } from '../server/common.js';

type Client = Pick<OmadaClient, 'getClientSsidDistribution'>;

export function registerGetClientSsidDistributionTool(server: McpServer, client: Client): void {
    server.registerTool(
        'getClientSsidDistribution',
        {
            description: 'Get how wireless clients are spread over SSIDs.',
            inputSchema: siteInputSchema.shape,
        },
        wrapToolHandler('getClientSsidDistribution', async ({ siteId, customHeaders }) =>
            toToolResult(await client.getClientSsidDistribution(siteId, customHeaders))
        )
    );
}
