import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import type { OmadaClient } from '../omadaClient/index.js';
import { siteInputSchema, wrapMutationToolHandler } from '../server/common.js';
import { dryRunSchema, mutationSummary, runBatchDelete, toRecords } from './resourceMutationShared.js';

const inputSchema = siteInputSchema.extend({
    groupId: z.string().trim().min(1).describe('Voucher group ID from listVoucherGroups.'),
    voucherIds: z.array(z.string().trim().min(1)).min(1).max(1000).describe('Voucher IDs from getVoucherGroupDetail (not the codes).'),
    dryRun: dryRunSchema,
});

type Client = Pick<OmadaClient, 'deleteVoucher' | 'deleteVouchers' | 'getVoucherGroupDetail'>;

export function registerDeleteVouchersTool(server: McpServer, client: Client): void {
    server.registerTool(
        'deleteVouchers',
        {
            description:
                'Delete selected vouchers of a voucher group by ID. Every ID must belong to the group. Defaults to a preview of the vouchers; set dryRun:false to delete and verify they are gone.',
            inputSchema: inputSchema.shape,
            annotations: { destructiveHint: true },
        },
        wrapMutationToolHandler<typeof inputSchema.shape>(
            'deleteVouchers',
            mutationSummary('delete-vouchers', (args) => String(args.groupId)),
            async ({ groupId, voucherIds, siteId, customHeaders, dryRun }) =>
                await runBatchDelete({
                    spec: {
                        label: 'voucher',
                        list: async () =>
                            toRecords(
                                (
                                    (await client.getVoucherGroupDetail(groupId, { page: 1, pageSize: 1000 }, siteId, customHeaders)) as {
                                        data?: unknown;
                                    }
                                )?.data ?? []
                            ),
                        nameKey: null,
                    },
                    ids: voucherIds,
                    dryRun,
                    write: () =>
                        voucherIds.length === 1
                            ? client.deleteVoucher(voucherIds[0], siteId, customHeaders)
                            : client.deleteVouchers(groupId, voucherIds, siteId, customHeaders),
                    warnings: ['Deleted voucher codes stop working; clients using them are no longer authorized when their session ends.'],
                })
        )
    );
}
