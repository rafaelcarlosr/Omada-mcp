import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import type { OmadaClient } from '../omadaClient/index.js';
import { siteInputSchema, wrapMutationToolHandler } from '../server/common.js';
import { dryRunSchema, mutationSummary, runDelete } from './resourceMutationShared.js';

const inputSchema = siteInputSchema.extend({
    ruleId: z.string().trim().min(1).describe('Rule ID from listApOuiRules.'),
    dryRun: dryRunSchema,
});

type Client = Pick<OmadaClient, 'deleteApOuiRule' | 'listApOuiRules'>;

export function registerDeleteApOuiRuleTool(server: McpServer, client: Client): void {
    server.registerTool(
        'deleteApOuiRule',
        {
            description:
                'Delete an AP OUI-based VLAN rule; matching clients use the SSID VLAN again. Defaults to a preview; set dryRun:false to delete and verify it is gone.',
            inputSchema: inputSchema.shape,
            annotations: { destructiveHint: true },
        },
        wrapMutationToolHandler<typeof inputSchema.shape>(
            'deleteApOuiRule',
            mutationSummary('delete-ap-oui-rule', (args) => String(args.ruleId)),
            async ({ ruleId, siteId, customHeaders, dryRun }) =>
                await runDelete({
                    spec: { label: 'AP OUI VLAN rule', list: () => client.listApOuiRules(siteId, customHeaders) },
                    id: ruleId,
                    dryRun,
                    write: () => client.deleteApOuiRule(ruleId, siteId, customHeaders),
                })
        )
    );
}
