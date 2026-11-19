import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import type { OmadaClient } from '../omadaClient/index.js';
import { siteInputSchema, toToolResult, wrapToolHandler } from '../server/common.js';

type Client = Pick<OmadaClient, 'getNetworkOverviewCard'>;

export function registerGetNetworkOverviewCardTool(server: McpServer, client: Client): void {
    server.registerTool(
        'getNetworkOverviewCard',
        {
            description: 'Get the network overview card: gateway, AP and switch counts and their connection state.',
            inputSchema: siteInputSchema.shape,
        },
        wrapToolHandler('getNetworkOverviewCard', async ({ siteId, customHeaders }) =>
            toToolResult(await client.getNetworkOverviewCard(siteId, customHeaders))
        )
    );
}
