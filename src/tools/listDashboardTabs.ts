import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import type { OmadaClient } from '../omadaClient/index.js';
import { siteInputSchema, toToolResult, wrapToolHandler } from '../server/common.js';

type Client = Pick<OmadaClient, 'listDashboardTabs'>;

export function registerListDashboardTabsTool(server: McpServer, client: Client): void {
    server.registerTool(
        'listDashboardTabs',
        {
            description: 'List the dashboard tabs of the site with their card IDs.',
            inputSchema: siteInputSchema.shape,
        },
        wrapToolHandler('listDashboardTabs', async ({ siteId, customHeaders }) => toToolResult(await client.listDashboardTabs(siteId, customHeaders)))
    );
}
