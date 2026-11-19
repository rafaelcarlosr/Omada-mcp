import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import type { OmadaClient } from '../omadaClient/index.js';
import { siteInputSchema, wrapMutationToolHandler } from '../server/common.js';
import { allPages } from './ipsShared.js';
import { runReorder } from './orderShared.js';
import { dryRunSchema, mutationSummary, type RecordLike, toRecords } from './resourceMutationShared.js';

const inputSchema = siteInputSchema.extend({
    type: z.enum(['gateway', 'switch', 'eap']).describe('ACL set: gateway, switch or eap ACLs.'),
    aclIds: z
        .array(z.string().trim().min(1))
        .min(1)
        .max(1000)
        .describe('Every ACL of the type ID, once, in the new order (first is evaluated first).'),
    dryRun: dryRunSchema,
});

type Client = Pick<OmadaClient, 'getOswAclList' | 'listEapAcls' | 'listOsgAcls' | 'reorderAcls'>;

export function registerReorderAclsTool(server: McpServer, client: Client): void {
    server.registerTool(
        'reorderAcls',
        {
            description:
                'Set the evaluation order of the gateway, switch or EAP ACLs. List every ACL of the type once; the preview shows the current order. Defaults to a preview; set dryRun:false to apply and verify the order.',
            inputSchema: inputSchema.shape,
            annotations: { destructiveHint: true },
        },
        wrapMutationToolHandler<typeof inputSchema.shape>(
            'reorderAcls',
            mutationSummary('reorder-acls', (args) => String(args.type)),
            async ({ type, aclIds, siteId, customHeaders, dryRun }) => {
                const list = async (): Promise<RecordLike[]> => {
                    if (type === 'gateway') return toRecords(await client.listOsgAcls(siteId, customHeaders));
                    if (type === 'eap') return toRecords(await client.listEapAcls(siteId, customHeaders));
                    return await allPages((page, size) => client.getOswAclList(page, size, siteId, customHeaders));
                };
                return await runReorder({
                    label: `${type} ACL`,
                    ids: aclIds,
                    list,
                    write: (indexes) => client.reorderAcls(type, indexes, siteId, customHeaders),
                    dryRun,
                });
            }
        )
    );
}
