import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import type { OmadaClient } from '../omadaClient/index.js';
import { siteInputSchema, toToolResult, wrapToolHandler } from '../server/common.js';

type Client = Pick<OmadaClient, 'getClientFrequencyDistribution'>;

export function registerGetClientFrequencyDistributionTool(server: McpServer, client: Client): void {
    server.registerTool(
        'getClientFrequencyDistribution',
        {
            description: 'Get how wireless clients are spread over 2.4, 5 and 6 GHz.',
            inputSchema: siteInputSchema.shape,
        },
        wrapToolHandler('getClientFrequencyDistribution', async ({ siteId, customHeaders }) =>
            toToolResult(await client.getClientFrequencyDistribution(siteId, customHeaders))
        )
    );
}
