import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import type { OmadaClient } from '../omadaClient/index.js';
import { siteInputSchema, toToolResult, wrapToolHandler } from '../server/common.js';

const inputSchema = siteInputSchema.extend({
    voucherId: z.string().trim().min(1).describe('Voucher ID from getVoucherGroupDetail.'),
});

type Client = Pick<OmadaClient, 'getVoucher'>;

export function registerGetVoucherTool(server: McpServer, client: Client): void {
    server.registerTool(
        'getVoucher',
        {
            description: 'Get one voucher: code, status, limits, duration and usage. The code grants network access.',
            inputSchema: inputSchema.shape,
        },
        wrapToolHandler('getVoucher', async ({ voucherId, siteId, customHeaders }) =>
            toToolResult(await client.getVoucher(voucherId, siteId, customHeaders))
        )
    );
}
