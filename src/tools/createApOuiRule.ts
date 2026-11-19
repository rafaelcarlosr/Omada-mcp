import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import type { OmadaClient } from '../omadaClient/index.js';
import { ouiBasedVlanApOpenApiVOSchema } from '../omadaClient/requestSchemas.js';
import { siteInputSchema, wrapMutationToolHandler } from '../server/common.js';
import { apOuiRuleRequest } from './lanShared.js';
import { dryRunSchema, mutationSummary, type RecordLike, runCreate } from './resourceMutationShared.js';

const inputSchema = siteInputSchema.extend({
    payload: ouiBasedVlanApOpenApiVOSchema.describe(
        'AP OUI VLAN rule (official OuiBasedVlanApOpenApiVO): enable, name, ssidIdList and ruleCombine [{ ouiProfileId, vlanId 1-4094, priority 0-7 }].'
    ),
    dryRun: dryRunSchema,
});

type Client = Pick<OmadaClient, 'createApOuiRule' | 'listApOuiRules'>;

export function registerCreateApOuiRuleTool(server: McpServer, client: Client): void {
    server.registerTool(
        'createApOuiRule',
        {
            description:
                'Create an AP OUI-based VLAN rule: wireless clients whose MAC matches an OUI profile get that VLAN and priority on the listed SSIDs. Defaults to a preview; set dryRun:false to create once and verify by readback.',
            inputSchema: inputSchema.shape,
            annotations: { destructiveHint: true },
        },
        wrapMutationToolHandler<typeof inputSchema.shape>(
            'createApOuiRule',
            mutationSummary('create-ap-oui-rule', (args) => String((args.payload as { name?: unknown }).name)),
            async ({ payload, siteId, customHeaders, dryRun }) =>
                await runCreate({
                    spec: { label: 'AP OUI VLAN rule', list: () => client.listApOuiRules(siteId, customHeaders), normalize: apOuiRuleRequest },
                    payload: payload as RecordLike,
                    dryRun,
                    write: () => client.createApOuiRule(payload, siteId, customHeaders),
                    ...(payload.enable ? { warnings: ['Matching clients move to the rule VLAN when they reconnect.'] } : {}),
                })
        )
    );
}
