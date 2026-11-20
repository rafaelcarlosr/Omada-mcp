import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import type { OmadaClient } from '../omadaClient/index.js';
import { siteInputSchema, toToolResult, wrapToolHandler } from '../server/common.js';
import { dashboardWindowShape } from './dashboardWindowShared.js';

export function registerGetDashboardMostActiveEapsTool(server: McpServer, client: OmadaClient): void {
    server.registerTool(
        'getDashboardMostActiveEaps',
        {
            description:
                'Get the most active access points (EAPs) in a site, sorted by traffic volume. Covers the last hour unless start and end are given.',
            inputSchema: siteInputSchema.extend(dashboardWindowShape).shape,
        },
        wrapToolHandler('getDashboardMostActiveEaps', async ({ siteId, customHeaders, start, end }) =>
            toToolResult(await client.getDashboardMostActiveEaps(siteId, customHeaders, { start, end }))
        )
    );
}
