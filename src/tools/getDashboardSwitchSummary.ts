import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import type { OmadaClient } from '../omadaClient/index.js';
import { siteInputSchema, toToolResult, wrapToolHandler } from '../server/common.js';
import { dashboardWindowShape } from './dashboardWindowShared.js';

export function registerGetDashboardSwitchSummaryTool(server: McpServer, client: OmadaClient): void {
    server.registerTool(
        'getDashboardSwitchSummary',
        {
            description:
                'Get switch summary for a site dashboard: total switch count, total ports, active ports, PoE budget used vs available, and aggregate bandwidth. Covers the last hour unless start and end are given.',
            inputSchema: siteInputSchema.extend(dashboardWindowShape).shape,
        },
        wrapToolHandler('getDashboardSwitchSummary', async ({ siteId, customHeaders, start, end }) =>
            toToolResult(await client.getDashboardSwitchSummary(siteId, customHeaders, { start, end }))
        )
    );
}
