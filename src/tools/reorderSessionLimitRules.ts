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
        .describe('Every session limit rule ID, once, in the new order (first is evaluated first).'),
    dryRun: dryRunSchema,
});

type Client = Pick<OmadaClient, 'getGridSessionLimitRule' | 'reorderSessionLimitRules'>;

export function registerReorderSessionLimitRulesTool(server: McpServer, client: Client): void {
    server.registerTool(
        'reorderSessionLimitRules',
        {
            description:
                'Set the evaluation order of the session limit rules. List every session limit rule once; the preview shows the current order. Defaults to a preview; set dryRun:false to apply and verify the order.',
            inputSchema: inputSchema.shape,
            annotations: { destructiveHint: true },
        },
        wrapMutationToolHandler<typeof inputSchema.shape>(
            'reorderSessionLimitRules',
            mutationSummary('reorderSessionLimitRules', () => 'site'),
            async ({ ids, siteId, customHeaders, dryRun }) =>
                await runReorder({
                    label: 'session limit rule',
                    ids,
                    list: () => allPages((page, size) => client.getGridSessionLimitRule(page, size, siteId, customHeaders)),
                    write: (indexes) => client.reorderSessionLimitRules(indexes, siteId, customHeaders),
                    dryRun,
                })
        )
    );
}
