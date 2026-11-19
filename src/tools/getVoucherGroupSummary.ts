import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import type { OmadaClient } from '../omadaClient/index.js';
import { siteInputSchema, toToolResult, wrapToolHandler } from '../server/common.js';

const inputSchema = siteInputSchema.extend({
    groupId: z.string().trim().min(1).describe('Voucher group ID from listVoucherGroups.'),
});

type Client = Pick<OmadaClient, 'getVoucherGroupSummary'>;

export function registerGetVoucherGroupSummaryTool(server: McpServer, client: Client): void {
    server.registerTool(
        'getVoucherGroupSummary',
        {
            description: 'Get the voucher count, amount and duration of a voucher group by status (current, in use, expired, unused, created).',
            inputSchema: inputSchema.shape,
        },
        wrapToolHandler('getVoucherGroupSummary', async ({ groupId, siteId, customHeaders }) =>
            toToolResult(await client.getVoucherGroupSummary(groupId, siteId, customHeaders))
        )
    );
}
