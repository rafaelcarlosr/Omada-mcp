import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import type { OmadaClient } from '../omadaClient/index.js';
import { siteInputSchema, toToolResult, wrapToolHandler } from '../server/common.js';

const inputSchema = siteInputSchema.extend({
    tabId: z.string().trim().min(1).describe('Report tab ID from listReportTabs.'),
});

type Client = Pick<OmadaClient, 'getReportTab'>;

export function registerGetReportTabTool(server: McpServer, client: Client): void {
    server.registerTool(
        'getReportTab',
        {
            description: 'Get one network report tab with its card groups.',
            inputSchema: inputSchema.shape,
        },
        wrapToolHandler('getReportTab', async ({ tabId, siteId, customHeaders }) =>
            toToolResult(await client.getReportTab(tabId, siteId, customHeaders))
        )
    );
}
