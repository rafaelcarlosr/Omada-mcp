import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import type { OmadaClient } from '../omadaClient/index.js';
import { siteInputSchema, toToolResult, wrapToolHandler } from '../server/common.js';
import { dashboardWindowShape } from './dashboardWindowShared.js';

export function registerGetDashboardTrafficActivitiesTool(server: McpServer, client: OmadaClient): void {
    server.registerTool(
        'getDashboardTrafficActivities',
        {
            description:
                'Get traffic activity time-series data for a site, showing upload and download trends over time. Covers the last hour unless start and end are given.',
            inputSchema: siteInputSchema.extend(dashboardWindowShape).shape,
        },
        wrapToolHandler('getDashboardTrafficActivities', async ({ siteId, customHeaders, start, end }) =>
            toToolResult(await client.getDashboardTrafficActivities(siteId, customHeaders, { start, end }))
        )
    );
}
