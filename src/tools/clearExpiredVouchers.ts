import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import type { OmadaClient } from '../omadaClient/index.js';
import { siteInputSchema, wrapMutationToolHandler } from '../server/common.js';
import { dryRunSchema, findRecord, mutationSummary, runAction, toRecords } from './resourceMutationShared.js';

const inputSchema = siteInputSchema.extend({
    groupIds: z.array(z.string().trim().min(1)).min(1).max(1000).describe('Voucher group IDs from listVoucherGroups.'),
    dryRun: dryRunSchema,
});

type Client = Pick<OmadaClient, 'clearExpiredVouchers' | 'clearExpiredVouchersInGroups' | 'listVoucherGroups'>;

export function registerClearExpiredVouchersTool(server: McpServer, client: Client): void {
    server.registerTool(
        'clearExpiredVouchers',
        {
            description:
                'Delete the expired vouchers of the listed voucher groups; unused and in-use vouchers stay. Defaults to a preview with the voucher counts of each group; set dryRun:false to clear them.',
            inputSchema: inputSchema.shape,
            annotations: { destructiveHint: true },
        },
        wrapMutationToolHandler<typeof inputSchema.shape>(
            'clearExpiredVouchers',
            mutationSummary('clear-expired-vouchers', (args) => (args.groupIds as string[]).join(',')),
            async ({ groupIds, siteId, customHeaders, dryRun }) =>
                await runAction({
                    label: 'expired voucher cleanup',
                    dryRun,
                    preflight: async () => {
                        const groups = toRecords(await client.listVoucherGroups(siteId, customHeaders));
                        const missing = groupIds.filter((id) => !findRecord(groups, id));
                        if (missing.length) throw new Error(`No voucher group with id ${missing.join(', ')} exists. No request was sent.`);
                        return {
                            groups: groupIds.map((id) => {
                                const group = findRecord(groups, id);
                                return {
                                    id,
                                    name: group?.name,
                                    totalCount: group?.totalCount,
                                    unusedCount: group?.unusedCount,
                                    usedCount: group?.usedCount,
                                };
                            }),
                        };
                    },
                    write: () =>
                        groupIds.length === 1
                            ? client.clearExpiredVouchers(groupIds[0], siteId, customHeaders)
                            : client.clearExpiredVouchersInGroups(groupIds, siteId, customHeaders),
                })
        )
    );
}
