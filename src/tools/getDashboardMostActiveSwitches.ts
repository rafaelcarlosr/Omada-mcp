import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import type { OmadaClient } from '../omadaClient/index.js';
import { siteInputSchema, toToolResult, wrapToolHandler } from '../server/common.js';
import { dashboardWindowShape } from './dashboardWindowShared.js';

export function registerGetDashboardMostActiveSwitchesTool(server: McpServer, client: OmadaClient): void {
    server.registerTool(
        'getDashboardMostActiveSwitches',
        {
            description: 'Get the most active switches in a site, sorted by traffic volume. Covers the last hour unless start and end are given.',
            inputSchema: siteInputSchema.extend(dashboardWindowShape).shape,
        },
        wrapToolHandler('getDashboardMostActiveSwitches', async ({ siteId, customHeaders, start, end }) =>
            toToolResult(await client.getDashboardMostActiveSwitches(siteId, customHeaders, { start, end }))
        )
    );
}
