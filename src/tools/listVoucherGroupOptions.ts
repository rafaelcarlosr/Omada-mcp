import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import type { OmadaClient } from '../omadaClient/index.js';
import { siteInputSchema, toToolResult, wrapToolHandler } from '../server/common.js';
import { createPaginationSchema } from '../utils/pagination-schema.js';

const inputSchema = siteInputSchema.extend({
    ...createPaginationSchema(),
});

type Client = Pick<OmadaClient, 'listVoucherGroupOptions'>;

export function registerListVoucherGroupOptionsTool(server: McpServer, client: Client): void {
    server.registerTool(
        'listVoucherGroupOptions',
        {
            description: 'List voucher group names and IDs for filters, including the "all" option.',
            inputSchema: inputSchema.shape,
        },
        wrapToolHandler('listVoucherGroupOptions', async ({ page, pageSize, siteId, customHeaders }) =>
            toToolResult(await client.listVoucherGroupOptions(page ?? 1, pageSize ?? 10, siteId, customHeaders))
        )
    );
}
