import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import type { OmadaClient } from '../omadaClient/index.js';
import { siteInputSchema, toToolResult, wrapToolHandler } from '../server/common.js';

const inputSchema = siteInputSchema.extend({
    start: z.number().int().nonnegative().describe('Start of the period, epoch seconds.'),
    end: z.number().int().nonnegative().describe('End of the period, epoch seconds.'),
    groupId: z.string().trim().min(1).optional().describe('Voucher group ID from listVoucherGroups; omit for every group.'),
});

type Client = Pick<OmadaClient, 'getVoucherHistoryStatistics'>;

export function registerGetVoucherHistoryStatisticsTool(server: McpServer, client: Client): void {
    server.registerTool(
        'getVoucherHistoryStatistics',
        {
            description: 'Get voucher usage over a period (count, amount, duration per day), for every group or one group.',
            inputSchema: inputSchema.shape,
        },
        wrapToolHandler('getVoucherHistoryStatistics', async ({ start, end, groupId, siteId, customHeaders }) =>
            toToolResult(await client.getVoucherHistoryStatistics({ start, end }, groupId, siteId, customHeaders))
        )
    );
}
