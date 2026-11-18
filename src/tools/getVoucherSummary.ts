import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import type { OmadaClient } from '../omadaClient/index.js';
import { siteInputSchema, toToolResult, wrapToolHandler } from '../server/common.js';

type Client = Pick<OmadaClient, 'getVoucherSummary'>;

export function registerGetVoucherSummaryTool(server: McpServer, client: Client): void {
    server.registerTool(
        'getVoucherSummary',
        {
            description: 'Get all-time voucher counts, revenue and duration split into current, in use, expired, unused and created.',
            inputSchema: siteInputSchema.shape,
        },
        wrapToolHandler('getVoucherSummary', async ({ siteId, customHeaders }) => toToolResult(await client.getVoucherSummary(siteId, customHeaders)))
    );
}
