import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import type { OmadaClient } from '../omadaClient/index.js';
import { sessionLimitRuleOpenApiVOSchema } from '../omadaClient/requestSchemas.js';
import { siteInputSchema, wrapMutationToolHandler } from '../server/common.js';
import { allPages } from './ipsShared.js';
import { dryRunSchema, mutationSummary, type RecordLike, runCreate } from './resourceMutationShared.js';

const inputSchema = siteInputSchema.extend({
    payload: sessionLimitRuleOpenApiVOSchema.describe(
        'Session limit rule (official SessionLimitRuleOpenApiVO): name, status, sourceType (0 networks, 1 IP groups, 2 one IP) with sourceIds or ip, and maxSession.'
    ),
    dryRun: dryRunSchema,
});

type Client = Pick<OmadaClient, 'createSessionLimitRule' | 'getGridSessionLimitRule'>;

export function registerCreateSessionLimitRuleTool(server: McpServer, client: Client): void {
    server.registerTool(
        'createSessionLimitRule',
        {
            description:
                'Create a session limit rule: hosts in the source may open at most maxSession concurrent sessions through the gateway. Defaults to a preview; set dryRun:false to create once and verify by readback.',
            inputSchema: inputSchema.shape,
            annotations: { destructiveHint: true },
        },
        wrapMutationToolHandler<typeof inputSchema.shape>(
            'createSessionLimitRule',
            mutationSummary('create-session-limit-rule', (args) => String((args.payload as { name?: unknown }).name)),
            async ({ payload, siteId, customHeaders, dryRun }) =>
                await runCreate({
                    spec: {
                        label: 'session limit rule',
                        list: () => allPages((page, size) => client.getGridSessionLimitRule(page, size, siteId, customHeaders)),
                    },
                    payload: payload as RecordLike,
                    dryRun,
                    write: () => client.createSessionLimitRule(payload, siteId, customHeaders),
                })
        )
    );
}
