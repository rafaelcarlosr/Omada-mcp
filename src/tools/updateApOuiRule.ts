import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import type { OmadaClient } from '../omadaClient/index.js';
import { ouiBasedVlanApOpenApiVOSchema } from '../omadaClient/requestSchemas.js';
import { siteInputSchema, wrapMutationToolHandler } from '../server/common.js';
import { apOuiRuleRequest } from './lanShared.js';
import { dryRunSchema, findRecord, mutationSummary, type RecordLike, runUpdate, toRecords } from './resourceMutationShared.js';

const inputSchema = siteInputSchema.extend({
    ruleId: z.string().trim().min(1).describe('Rule ID from listApOuiRules.'),
    changes: ouiBasedVlanApOpenApiVOSchema
        .partial()
        .refine((value) => Object.keys(value).length > 0, 'At least one change is required.')
        .describe('Fields to change; the others keep their current values. ssidIdList and ruleCombine replace the current lists.'),
    dryRun: dryRunSchema,
});

type Client = Pick<OmadaClient, 'listApOuiRules' | 'updateApOuiRule'>;

export function registerUpdateApOuiRuleTool(server: McpServer, client: Client): void {
    server.registerTool(
        'updateApOuiRule',
        {
            description:
                'Change an AP OUI-based VLAN rule. Only the listed fields change; the controller needs the complete rule, so the rest comes from the current one. Defaults to a preview; set dryRun:false to apply once and verify by readback.',
            inputSchema: inputSchema.shape,
            annotations: { destructiveHint: true },
        },
        wrapMutationToolHandler<typeof inputSchema.shape>(
            'updateApOuiRule',
            mutationSummary('update-ap-oui-rule', (args) => String(args.ruleId)),
            async ({ ruleId, changes, siteId, customHeaders, dryRun }) => {
                const current = findRecord(toRecords(await client.listApOuiRules(siteId, customHeaders)), ruleId);
                if (!current) throw new Error(`No AP OUI VLAN rule with id "${ruleId}" exists. List them again to get a current id.`);
                const { id: _id, ...base } = apOuiRuleRequest(current);
                const payload = ouiBasedVlanApOpenApiVOSchema.parse({ ...base, ...changes });
                return await runUpdate({
                    spec: { label: 'AP OUI VLAN rule', list: () => client.listApOuiRules(siteId, customHeaders), normalize: apOuiRuleRequest },
                    id: ruleId,
                    payload: payload as RecordLike,
                    dryRun,
                    write: () => client.updateApOuiRule(ruleId, payload, siteId, customHeaders),
                });
            }
        )
    );
}
