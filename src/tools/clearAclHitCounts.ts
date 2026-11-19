import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import type { OmadaClient } from '../omadaClient/index.js';
import { siteInputSchema, wrapMutationToolHandler } from '../server/common.js';
import { dryRunSchema, mutationSummary, runAction } from './resourceMutationShared.js';

const inputSchema = siteInputSchema.extend({
    scope: z.enum(['gateway', 'gateway-custom']).describe('Counters to clear: gateway ACLs or gateway custom ACLs.'),
    dryRun: dryRunSchema,
});

type Client = Pick<OmadaClient, 'clearGatewayAclHitCounts' | 'clearGatewayCustomAclHitCounts'>;

export function registerClearAclHitCountsTool(server: McpServer, client: Client): void {
    server.registerTool(
        'clearAclHitCounts',
        {
            description:
                'Reset the hit counters of the gateway ACLs or gateway custom ACLs to zero. The counters cannot be restored. Defaults to a preview; set dryRun:false to clear.',
            inputSchema: inputSchema.shape,
            annotations: { destructiveHint: true },
        },
        wrapMutationToolHandler<typeof inputSchema.shape>(
            'clearAclHitCounts',
            mutationSummary('clear-acl-hit-counts', (args) => String(args.scope)),
            async ({ scope, siteId, customHeaders, dryRun }) =>
                await runAction({
                    label: 'ACL hit counters',
                    dryRun,
                    preflight: async () => ({ scope }),
                    write: () =>
                        scope === 'gateway'
                            ? client.clearGatewayAclHitCounts(siteId, customHeaders)
                            : client.clearGatewayCustomAclHitCounts(siteId, customHeaders),
                    warnings: ['Cleared hit counters cannot be restored.'],
                })
        )
    );
}
