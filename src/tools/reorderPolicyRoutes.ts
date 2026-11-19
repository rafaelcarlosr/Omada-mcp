import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import type { OmadaClient } from '../omadaClient/index.js';
import { siteInputSchema, wrapMutationToolHandler } from '../server/common.js';
import { allPages } from './ipsShared.js';
import { runReorder } from './orderShared.js';
import { dryRunSchema, mutationSummary } from './resourceMutationShared.js';

const inputSchema = siteInputSchema.extend({
    ids: z.array(z.string().trim().min(1)).min(1).max(1000).describe('Every policy route ID, once, in the new order (first is evaluated first).'),
    dryRun: dryRunSchema,
});

type Client = Pick<OmadaClient, 'getGridPolicyRouting' | 'reorderPolicyRoutes'>;

export function registerReorderPolicyRoutesTool(server: McpServer, client: Client): void {
    server.registerTool(
        'reorderPolicyRoutes',
        {
            description:
                'Set the evaluation order of the policy routes. List every policy route once; the preview shows the current order. Defaults to a preview; set dryRun:false to apply and verify the order.',
            inputSchema: inputSchema.shape,
            annotations: { destructiveHint: true },
        },
        wrapMutationToolHandler<typeof inputSchema.shape>(
            'reorderPolicyRoutes',
            mutationSummary('reorderPolicyRoutes', () => 'site'),
            async ({ ids, siteId, customHeaders, dryRun }) =>
                await runReorder({
                    label: 'policy route',
                    ids,
                    list: () => allPages((page, size) => client.getGridPolicyRouting(page, size, siteId, customHeaders)),
                    write: (indexes) => client.reorderPolicyRoutes(indexes, siteId, customHeaders),
                    dryRun,
                })
        )
    );
}
