import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import type { OmadaClient } from '../omadaClient/index.js';
import { siteInputSchema, toToolResult, wrapToolHandler } from '../server/common.js';

type Client = Pick<OmadaClient, 'listReportTabs'>;

export function registerListReportTabsTool(server: McpServer, client: Client): void {
    server.registerTool(
        'listReportTabs',
        {
            description: 'List the network report tabs of the site with their card groups.',
            inputSchema: siteInputSchema.shape,
        },
        wrapToolHandler('listReportTabs', async ({ siteId, customHeaders }) => toToolResult(await client.listReportTabs(siteId, customHeaders)))
    );
}
