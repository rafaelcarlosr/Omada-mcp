import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import type { OmadaClient } from '../omadaClient/index.js';
import { siteInputSchema, toToolResult, wrapToolHandler } from '../server/common.js';

type Client = Pick<OmadaClient, 'getClientSignalDistribution'>;

export function registerGetClientSignalDistributionTool(server: McpServer, client: Client): void {
    server.registerTool(
        'getClientSignalDistribution',
        {
            description: 'Get how wireless clients are spread over signal quality levels and bands.',
            inputSchema: siteInputSchema.shape,
        },
        wrapToolHandler('getClientSignalDistribution', async ({ siteId, customHeaders }) =>
            toToolResult(await client.getClientSignalDistribution(siteId, customHeaders))
        )
    );
}
