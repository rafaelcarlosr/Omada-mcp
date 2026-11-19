import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import type { OmadaClient } from '../omadaClient/index.js';
import { siteInputSchema, wrapMutationToolHandler } from '../server/common.js';
import { dryRunSchema, mutationSummary, runBatchDelete } from './resourceMutationShared.js';

const inputSchema = siteInputSchema.extend({
    groupIds: z.array(z.string().trim().min(1)).min(1).max(1000).describe('Voucher group IDs from listVoucherGroups.'),
    dryRun: dryRunSchema,
});

type Client = Pick<OmadaClient, 'deleteVoucherGroups' | 'listVoucherGroups'>;

export function registerDeleteVoucherGroupsTool(server: McpServer, client: Client): void {
    server.registerTool(
        'deleteVoucherGroups',
        {
            description:
                'Delete several voucher groups, and all their vouchers, in one request. Only the listed IDs are deleted. Defaults to a preview of the groups; set dryRun:false to delete and verify they are gone.',
            inputSchema: inputSchema.shape,
            annotations: { destructiveHint: true },
        },
        wrapMutationToolHandler<typeof inputSchema.shape>(
            'deleteVoucherGroups',
            mutationSummary('delete-voucher-groups', (args) => (args.groupIds as string[]).join(',')),
            async ({ groupIds, siteId, customHeaders, dryRun }) =>
                await runBatchDelete({
                    spec: { label: 'voucher group', list: () => client.listVoucherGroups(siteId, customHeaders) },
                    ids: groupIds,
                    dryRun,
                    write: () => client.deleteVoucherGroups(groupIds, siteId, customHeaders),
                    warnings: ['Every voucher of these groups, used or not, is deleted.'],
                })
        )
    );
}
