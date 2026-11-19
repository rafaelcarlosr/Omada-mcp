import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import type { OmadaClient } from '../omadaClient/index.js';
import { siteInputSchema, toToolResult, wrapToolHandler } from '../server/common.js';
import { createPaginationSchema } from '../utils/pagination-schema.js';

const inputSchema = siteInputSchema.extend({
    groupId: z.string().trim().min(1).describe('Voucher group ID from listVoucherGroups.'),
    status: z.number().int().min(0).max(2).optional().describe('Only vouchers with this status: 0 unused, 1 in use, 2 expired.'),
    searchKey: z.string().min(1).optional().describe('Fuzzy search on the voucher code.'),
    ...createPaginationSchema(),
});

type Client = Pick<OmadaClient, 'getVoucherGroupDetail'>;

export function registerGetVoucherGroupDetailTool(server: McpServer, client: Client): void {
    server.registerTool(
        'getVoucherGroupDetail',
        {
            description:
                'Get a voucher group with its settings, print pattern, counts and one page of its vouchers (codes, status, time used and left). Voucher codes grant network access.',
            inputSchema: inputSchema.shape,
        },
        wrapToolHandler('getVoucherGroupDetail', async ({ groupId, status, searchKey, page, pageSize, siteId, customHeaders }) =>
            toToolResult(
                await client.getVoucherGroupDetail(groupId, { page: page ?? 1, pageSize: pageSize ?? 10, status, searchKey }, siteId, customHeaders)
            )
        )
    );
}
