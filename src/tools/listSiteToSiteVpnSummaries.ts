import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import type { OmadaClient } from '../omadaClient/index.js';
import { siteInputSchema, toToolResult, wrapToolHandler } from '../server/common.js';

type Client = Pick<OmadaClient, 'listSiteToSiteVpnSummaries'>;

export function registerListSiteToSiteVpnSummariesTool(server: McpServer, client: Client): void {
    server.registerTool(
        'listSiteToSiteVpnSummaries',
        {
            description: 'List the site-to-site VPNs of a site with their type, WANs and status.',
            inputSchema: siteInputSchema.shape,
        },
        wrapToolHandler('listSiteToSiteVpnSummaries', async ({ siteId, customHeaders }) =>
            toToolResult(await client.listSiteToSiteVpnSummaries(siteId, customHeaders))
        )
    );
}
