import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import type { OmadaClient } from '../omadaClient/index.js';
import { siteInputSchema, toToolResult, wrapToolHandler } from '../server/common.js';

const inputSchema = siteInputSchema.extend({
    groupId: z.string().trim().min(1).describe('Voucher group ID from listVoucherGroups.'),
});

type Client = Pick<OmadaClient, 'listUnusedVoucherCodes'>;

export function registerListUnusedVoucherCodesTool(server: McpServer, client: Client): void {
    server.registerTool(
        'listUnusedVoucherCodes',
        {
            description: 'List the codes of the unused vouchers of a group, as printed. Voucher codes grant network access.',
            inputSchema: inputSchema.shape,
        },
        wrapToolHandler('listUnusedVoucherCodes', async ({ groupId, siteId, customHeaders }) =>
            toToolResult(await client.listUnusedVoucherCodes(groupId, siteId, customHeaders))
        )
    );
}
