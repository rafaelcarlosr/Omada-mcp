import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import type { OmadaClient } from '../omadaClient/index.js';
import { siteInputSchema, wrapMutationToolHandler } from '../server/common.js';
import { allPages } from './ipsShared.js';
import { runReorder } from './orderShared.js';
import { dryRunSchema, mutationSummary } from './resourceMutationShared.js';

const inputSchema = siteInputSchema.extend({
    ids: z
        .array(z.string().trim().min(1))
        .min(1)
        .max(1000)
        .describe('Every bandwidth control rule ID, once, in the new order (first is evaluated first).'),
    dryRun: dryRunSchema,
});

type Client = Pick<OmadaClient, 'getGridBandwidthCtrlRule' | 'reorderBandwidthControlRules'>;

export function registerReorderBandwidthControlRulesTool(server: McpServer, client: Client): void {
    server.registerTool(
        'reorderBandwidthControlRules',
        {
            description:
                'Set the evaluation order of the bandwidth control rules. List every bandwidth control rule once; the preview shows the current order. Defaults to a preview; set dryRun:false to apply and verify the order.',
            inputSchema: inputSchema.shape,
            annotations: { destructiveHint: true },
        },
        wrapMutationToolHandler<typeof inputSchema.shape>(
            'reorderBandwidthControlRules',
            mutationSummary('reorderBandwidthControlRules', () => 'site'),
            async ({ ids, siteId, customHeaders, dryRun }) =>
                await runReorder({
                    label: 'bandwidth control rule',
                    ids,
                    list: () => allPages((page, size) => client.getGridBandwidthCtrlRule(page, size, siteId, customHeaders)),
                    write: (indexes) => client.reorderBandwidthControlRules(indexes, siteId, customHeaders),
                    dryRun,
                })
        )
    );
}
