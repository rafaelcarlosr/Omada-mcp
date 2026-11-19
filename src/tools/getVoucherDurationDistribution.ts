import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import type { OmadaClient } from '../omadaClient/index.js';
import { siteInputSchema, toToolResult, wrapToolHandler } from '../server/common.js';

const inputSchema = siteInputSchema.extend({
    start: z.number().int().nonnegative().describe('Start of the period, epoch seconds.'),
    end: z.number().int().nonnegative().describe('End of the period, epoch seconds.'),
    groupId: z.string().trim().min(1).optional().describe('Voucher group ID from listVoucherGroups; omit for every group.'),
});

type Client = Pick<OmadaClient, 'getVoucherDurationDistribution'>;

export function registerGetVoucherDurationDistributionTool(server: McpServer, client: Client): void {
    server.registerTool(
        'getVoucherDurationDistribution',
        {
            description: 'Get how used vouchers are distributed by duration over a period, for every group or one group.',
            inputSchema: inputSchema.shape,
        },
        wrapToolHandler('getVoucherDurationDistribution', async ({ start, end, groupId, siteId, customHeaders }) =>
            toToolResult(await client.getVoucherDurationDistribution({ start, end }, groupId, siteId, customHeaders))
        )
    );
}
