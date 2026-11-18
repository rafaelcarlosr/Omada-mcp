import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import type { OmadaClient } from '../omadaClient/index.js';
import { siteInputSchema, toToolResult, wrapToolHandler } from '../server/common.js';

type Client = Pick<OmadaClient, 'listSwitchPortOverview'>;

export function registerListSwitchPortOverviewTool(server: McpServer, client: Client): void {
    server.registerTool(
        'listSwitchPortOverview',
        {
            description: 'List every switch port in the site with link status, speed, duplex, profile and STP state. Returns every page.',
            inputSchema: siteInputSchema.shape,
        },
        wrapToolHandler('listSwitchPortOverview', async ({ siteId, customHeaders }) =>
            toToolResult(await client.listSwitchPortOverview(siteId, customHeaders))
        )
    );
}
