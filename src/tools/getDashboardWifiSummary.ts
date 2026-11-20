import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import type { OmadaClient } from '../omadaClient/index.js';
import { siteInputSchema, toToolResult, wrapToolHandler } from '../server/common.js';
import { dashboardWindowShape } from './dashboardWindowShared.js';

export function registerGetDashboardWifiSummaryTool(server: McpServer, client: OmadaClient): void {
    server.registerTool(
        'getDashboardWifiSummary',
        {
            description:
                'Get WiFi summary for a site dashboard: total APs, connected AP count, wireless client count, channel utilization per band (2.4GHz/5GHz), and SSID count. Covers the last hour unless start and end are given.',
            inputSchema: siteInputSchema.extend(dashboardWindowShape).shape,
        },
        wrapToolHandler('getDashboardWifiSummary', async ({ siteId, customHeaders, start, end }) =>
            toToolResult(await client.getDashboardWifiSummary(siteId, customHeaders, { start, end }))
        )
    );
}
