import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import type { OmadaClient } from '../omadaClient/index.js';
import { siteInputSchema, toToolResult, wrapToolHandler } from '../server/common.js';
import { dashboardWindowShape } from './dashboardWindowShared.js';

export function registerGetDashboardTopMemoryUsageTool(server: McpServer, client: OmadaClient): void {
    server.registerTool(
        'getDashboardTopMemoryUsage',
        {
            description:
                'Get the top devices by memory usage for a site, useful for identifying memory-constrained devices. Covers the last hour unless start and end are given.',
            inputSchema: siteInputSchema.extend(dashboardWindowShape).shape,
        },
        wrapToolHandler('getDashboardTopMemoryUsage', async ({ siteId, customHeaders, start, end }) =>
            toToolResult(await client.getDashboardTopMemoryUsage(siteId, customHeaders, { start, end }))
        )
    );
}
