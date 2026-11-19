import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import type { OmadaClient } from '../omadaClient/index.js';
import { siteInputSchema, toToolResult, wrapToolHandler } from '../server/common.js';

type Client = Pick<OmadaClient, 'getVoucherGroupConfigLimit'>;

export function registerGetVoucherGroupConfigLimitTool(server: McpServer, client: Client): void {
    server.registerTool(
        'getVoucherGroupConfigLimit',
        {
            description: 'Get the maximum number of vouchers the site can hold.',
            inputSchema: siteInputSchema.shape,
        },
        wrapToolHandler('getVoucherGroupConfigLimit', async ({ siteId, customHeaders }) =>
            toToolResult(await client.getVoucherGroupConfigLimit(siteId, customHeaders))
        )
    );
}
