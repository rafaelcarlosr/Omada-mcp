import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import type { OmadaClient } from '../omadaClient/index.js';
import { siteInputSchema, toToolResult, wrapToolHandler } from '../server/common.js';

type Client = Pick<OmadaClient, 'listVoucherCurrencies'>;

export function registerListVoucherCurrenciesTool(server: McpServer, client: Client): void {
    server.registerTool(
        'listVoucherCurrencies',
        {
            description: 'List the currency codes vouchers can be priced in.',
            inputSchema: siteInputSchema.shape,
        },
        wrapToolHandler('listVoucherCurrencies', async ({ siteId, customHeaders }) =>
            toToolResult(await client.listVoucherCurrencies(siteId, customHeaders))
        )
    );
}
