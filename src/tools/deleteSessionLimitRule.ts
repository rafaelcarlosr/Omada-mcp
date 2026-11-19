import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import type { OmadaClient } from '../omadaClient/index.js';
import { siteInputSchema, wrapMutationToolHandler } from '../server/common.js';
import { allPages } from './ipsShared.js';
import { dryRunSchema, mutationSummary, runDelete } from './resourceMutationShared.js';

const inputSchema = siteInputSchema.extend({
    ruleId: z.string().trim().min(1).describe('Rule ID from getGridSessionLimitRule.'),
    dryRun: dryRunSchema,
});

type Client = Pick<OmadaClient, 'deleteSessionLimitRule' | 'getGridSessionLimitRule'>;

export function registerDeleteSessionLimitRuleTool(server: McpServer, client: Client): void {
    server.registerTool(
        'deleteSessionLimitRule',
        {
            description: 'Delete a session limit rule. Defaults to a preview; set dryRun:false to delete and verify it is gone.',
            inputSchema: inputSchema.shape,
            annotations: { destructiveHint: true },
        },
        wrapMutationToolHandler<typeof inputSchema.shape>(
            'deleteSessionLimitRule',
            mutationSummary('delete-session-limit-rule', (args) => String(args.ruleId)),
            async ({ ruleId, siteId, customHeaders, dryRun }) =>
                await runDelete({
                    spec: {
                        label: 'session limit rule',
                        list: () => allPages((page, size) => client.getGridSessionLimitRule(page, size, siteId, customHeaders)),
                    },
                    id: ruleId,
                    dryRun,
                    write: () => client.deleteSessionLimitRule(ruleId, siteId, customHeaders),
                })
        )
    );
}
