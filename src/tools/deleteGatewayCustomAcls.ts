import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import type { OmadaClient } from '../omadaClient/index.js';
import { siteInputSchema, wrapMutationToolHandler } from '../server/common.js';
import { allPages } from './ipsShared.js';
import { dryRunSchema, mutationSummary, runBatchDelete } from './resourceMutationShared.js';

const inputSchema = siteInputSchema.extend({
    aclIds: z.array(z.string().trim().min(1)).min(1).max(1000).describe('Custom ACL IDs from getOsgCustomAclList; only these are deleted.'),
    dryRun: dryRunSchema,
});

type Client = Pick<OmadaClient, 'deleteGatewayCustomAcls' | 'getOsgCustomAclList'>;

export function registerDeleteGatewayCustomAclsTool(server: McpServer, client: Client): void {
    server.registerTool(
        'deleteGatewayCustomAcls',
        {
            description:
                'Delete gateway custom ACLs by ID. Only the listed IDs are deleted, never "all". Defaults to a preview; set dryRun:false to delete and verify they are gone.',
            inputSchema: inputSchema.shape,
            annotations: { destructiveHint: true },
        },
        wrapMutationToolHandler<typeof inputSchema.shape>(
            'deleteGatewayCustomAcls',
            mutationSummary('delete-gateway-custom-acls', (args) => `${(args.aclIds as string[]).length} ACL(s)`),
            async ({ aclIds, siteId, customHeaders, dryRun }) =>
                await runBatchDelete({
                    spec: {
                        label: 'gateway custom ACL',
                        list: () => allPages((page, size) => client.getOsgCustomAclList(page, size, siteId, customHeaders)),
                        nameKey: 'description',
                    },
                    ids: aclIds,
                    dryRun,
                    write: () => client.deleteGatewayCustomAcls([...new Set(aclIds)], siteId, customHeaders),
                })
        )
    );
}
