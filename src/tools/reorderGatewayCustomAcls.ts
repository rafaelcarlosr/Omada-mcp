import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import type { OmadaClient } from '../omadaClient/index.js';
import { siteInputSchema, wrapMutationToolHandler } from '../server/common.js';
import { allPages } from './ipsShared.js';
import { runReorder } from './orderShared.js';
import { dryRunSchema, mutationSummary } from './resourceMutationShared.js';

const inputSchema = siteInputSchema.extend({
    aclIds: z
        .array(z.string().trim().min(1))
        .min(1)
        .max(1000)
        .describe('Every gateway custom ACL ID, once, in the new order (first is evaluated first).'),
    dryRun: dryRunSchema,
});

type Client = Pick<OmadaClient, 'getOsgCustomAclList' | 'reorderGatewayCustomAcls'>;

export function registerReorderGatewayCustomAclsTool(server: McpServer, client: Client): void {
    server.registerTool(
        'reorderGatewayCustomAcls',
        {
            description:
                'Set the evaluation order of the gateway custom ACLs. List every custom ACL once; the preview shows the current order. Defaults to a preview; set dryRun:false to apply and verify the order.',
            inputSchema: inputSchema.shape,
            annotations: { destructiveHint: true },
        },
        wrapMutationToolHandler<typeof inputSchema.shape>(
            'reorderGatewayCustomAcls',
            mutationSummary('reorder-gateway-custom-acls', () => 'site'),
            async ({ aclIds, siteId, customHeaders, dryRun }) =>
                await runReorder({
                    label: 'gateway custom ACL',
                    ids: aclIds,
                    list: () => allPages((page, size) => client.getOsgCustomAclList(page, size, siteId, customHeaders)),
                    write: (indexes) => client.reorderGatewayCustomAcls(indexes, siteId, customHeaders),
                    dryRun,
                })
        )
    );
}
