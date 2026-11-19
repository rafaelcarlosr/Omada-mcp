import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import type { OmadaClient } from '../omadaClient/index.js';
import { siteInputSchema, toToolResult, wrapToolHandler } from '../server/common.js';

type Client = Pick<OmadaClient, 'listDashboardTabsWithoutOverall'>;

export function registerListDashboardTabsWithoutOverallTool(server: McpServer, client: Client): void {
    server.registerTool(
        'listDashboardTabsWithoutOverall',
        {
            description: 'List the dashboard tabs except the Overall tab.',
            inputSchema: siteInputSchema.shape,
        },
        wrapToolHandler('listDashboardTabsWithoutOverall', async ({ siteId, customHeaders }) =>
            toToolResult(await client.listDashboardTabsWithoutOverall(siteId, customHeaders))
        )
    );
}
