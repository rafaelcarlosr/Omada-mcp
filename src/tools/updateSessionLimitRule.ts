import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import type { OmadaClient } from '../omadaClient/index.js';
import { sessionLimitRuleOpenApiVOSchema } from '../omadaClient/requestSchemas.js';
import { siteInputSchema, wrapMutationToolHandler } from '../server/common.js';
import { pickBySchema } from './authProfileShared.js';
import { allPages } from './ipsShared.js';
import { dryRunSchema, findRecord, mutationSummary, type RecordLike, runUpdate } from './resourceMutationShared.js';

const inputSchema = siteInputSchema.extend({
    ruleId: z.string().trim().min(1).describe('Rule ID from getGridSessionLimitRule.'),
    changes: sessionLimitRuleOpenApiVOSchema
        .partial()
        .refine((value) => Object.keys(value).length > 0, 'At least one change is required.')
        .describe('Fields to change; the others keep their current values.'),
    dryRun: dryRunSchema,
});

type Client = Pick<OmadaClient, 'getGridSessionLimitRule' | 'updateSessionLimitRule'>;

export function registerUpdateSessionLimitRuleTool(server: McpServer, client: Client): void {
    server.registerTool(
        'updateSessionLimitRule',
        {
            description:
                'Change a session limit rule. Only the listed fields change; the rest comes from the current rule. Defaults to a preview; set dryRun:false to apply once and verify by readback.',
            inputSchema: inputSchema.shape,
            annotations: { destructiveHint: true },
        },
        wrapMutationToolHandler<typeof inputSchema.shape>(
            'updateSessionLimitRule',
            mutationSummary('update-session-limit-rule', (args) => String(args.ruleId)),
            async ({ ruleId, changes, siteId, customHeaders, dryRun }) => {
                const spec = {
                    label: 'session limit rule',
                    list: () => allPages((page, size) => client.getGridSessionLimitRule(page, size, siteId, customHeaders)),
                };
                const current = findRecord(await spec.list(), ruleId);
                if (!current) throw new Error(`No session limit rule with id "${ruleId}" exists. List them again to get a current id.`);
                const payload = sessionLimitRuleOpenApiVOSchema.parse({
                    ...(pickBySchema(sessionLimitRuleOpenApiVOSchema, current) as RecordLike),
                    ...changes,
                });
                return await runUpdate({
                    spec,
                    id: ruleId,
                    payload: payload as RecordLike,
                    dryRun,
                    write: () => client.updateSessionLimitRule(ruleId, payload, siteId, customHeaders),
                });
            }
        )
    );
}
