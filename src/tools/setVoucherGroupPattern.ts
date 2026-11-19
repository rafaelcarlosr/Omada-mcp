import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import type { OmadaClient } from '../omadaClient/index.js';
import { editVoucherGroupPatternOpenApiVO06Schema } from '../omadaClient/requestSchemas.js';
import { siteInputSchema, wrapMutationToolHandler } from '../server/common.js';
import { dryRunSchema, mutationSummary, runSettings } from './resourceMutationShared.js';

const inputSchema = siteInputSchema.extend({
    groupId: z.string().trim().min(1).describe('Voucher group ID from listVoucherGroups.'),
    payload: editVoucherGroupPatternOpenApiVO06Schema.describe(
        'Print pattern (official EditVoucherGroupPatternOpenApiVO): patternType (0 logo, 1 title, 2 none), position (0 left, 1 right, 2 middle), logoPictureId/logoSize 50-175, title/titleSize 12-18, ssidNetworkenable with ssidList and networkList, durationEnable, limitEnable, printComments.'
    ),
    dryRun: dryRunSchema,
});

type Client = Pick<OmadaClient, 'getVoucherGroupDetail' | 'setVoucherGroupPattern'>;

export function registerSetVoucherGroupPatternTool(server: McpServer, client: Client): void {
    server.registerTool(
        'setVoucherGroupPattern',
        {
            description:
                'Change how the vouchers of a group are printed: logo or title, position, SSIDs and networks, duration, limits and comments. The SSID/network list, logo picture and comments are not returned by the controller and are not verified by readback. Defaults to a preview; set dryRun:false to apply once and verify by readback.',
            inputSchema: inputSchema.shape,
            annotations: { destructiveHint: true },
        },
        wrapMutationToolHandler<typeof inputSchema.shape>(
            'setVoucherGroupPattern',
            mutationSummary('set-voucher-group-pattern', (args) => String(args.groupId)),
            async ({ groupId, payload, siteId, customHeaders, dryRun }) =>
                await runSettings({
                    label: 'voucher print pattern',
                    read: async () =>
                        (
                            (await client.getVoucherGroupDetail(groupId, { page: 1, pageSize: 1 }, siteId, customHeaders)) as {
                                voucherPattern?: unknown;
                            }
                        )?.voucherPattern,
                    payload,
                    dryRun,
                    write: () => client.setVoucherGroupPattern(groupId, payload, siteId, customHeaders),
                    writeOnly: ['ssidNetworkenable', 'ssidList', 'networkList', 'logoPictureId', 'printComments'],
                })
        )
    );
}
