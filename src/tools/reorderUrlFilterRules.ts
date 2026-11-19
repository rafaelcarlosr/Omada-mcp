import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import type { OmadaClient } from '../omadaClient/index.js';
import { siteInputSchema, wrapMutationToolHandler } from '../server/common.js';
import { runReorder } from './orderShared.js';
import { dryRunSchema, mutationSummary, toRecords } from './resourceMutationShared.js';

const inputSchema = siteInputSchema.extend({
    type: z.enum(['gateway', 'ap']).describe('Rule set: gateway or ap (EAP) URL filter rules.'),
    ruleIds: z
        .array(z.string().trim().min(1))
        .min(1)
        .max(1000)
        .describe('Every URL filter rule of the type ID, once, in the new order (first is evaluated first).'),
    dryRun: dryRunSchema,
});

type Client = Pick<OmadaClient, 'listUrlFilterRules' | 'reorderUrlFilterRules'>;

export function registerReorderUrlFilterRulesTool(server: McpServer, client: Client): void {
    server.registerTool(
        'reorderUrlFilterRules',
        {
            description:
                'Set the evaluation order of the gateway or AP URL filter rules. List every rule of the type once; the preview shows the current order. Defaults to a preview; set dryRun:false to apply and verify the order.',
            inputSchema: inputSchema.shape,
            annotations: { destructiveHint: true },
        },
        wrapMutationToolHandler<typeof inputSchema.shape>(
            'reorderUrlFilterRules',
            mutationSummary('reorder-url-filter-rules', (args) => String(args.type)),
            async ({ type, ruleIds, siteId, customHeaders, dryRun }) =>
                await runReorder({
                    label: 'URL filter rule',
                    ids: ruleIds,
                    list: async () => toRecords(await client.listUrlFilterRules(type === 'ap' ? 'eap' : 'gateway', siteId, customHeaders)),
                    write: (indexes) => client.reorderUrlFilterRules(type, indexes, siteId, customHeaders),
                    dryRun,
                })
        )
    );
}
