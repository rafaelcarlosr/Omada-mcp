import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import type { OmadaClient } from '../omadaClient/index.js';
import { siteInputSchema, toToolResult, wrapToolHandler } from '../server/common.js';

type Client = Pick<OmadaClient, 'getSiteHealthOverview'>;

export function registerGetSiteHealthOverviewTool(server: McpServer, client: Client): void {
    server.registerTool(
        'getSiteHealthOverview',
        {
            description: 'Get the global-map health overview of a site: switch, AP and client health counts, incidents and alerts.',
            inputSchema: siteInputSchema.shape,
        },
        wrapToolHandler('getSiteHealthOverview', async ({ siteId, customHeaders }) =>
            toToolResult(await client.getSiteHealthOverview(siteId, customHeaders))
        )
    );
}
