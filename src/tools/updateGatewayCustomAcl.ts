import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import type { OmadaClient } from '../omadaClient/index.js';
import { gatewayCustomACLModifyEntitySchema } from '../omadaClient/requestSchemas.js';
import { siteInputSchema, wrapMutationToolHandler } from '../server/common.js';
import { pickBySchema } from './authProfileShared.js';
import { allPages } from './ipsShared.js';
import { dryRunSchema, findRecord, mutationSummary, type RecordLike, runUpdate } from './resourceMutationShared.js';

const inputSchema = siteInputSchema.extend({
    aclId: z.string().trim().min(1).describe('Custom ACL ID from getOsgCustomAclList.'),
    changes: gatewayCustomACLModifyEntitySchema
        .omit({ id: true, index: true })
        .partial()
        .refine((value) => Object.keys(value).length > 0, 'At least one change is required.')
        .describe('Fields to change; the others keep their current values. Use reorderGatewayCustomAcls to move it.'),
    dryRun: dryRunSchema,
});

type Client = Pick<OmadaClient, 'getOsgCustomAclList' | 'updateGatewayCustomAcls'>;

export function registerUpdateGatewayCustomAclTool(server: McpServer, client: Client): void {
    server.registerTool(
        'updateGatewayCustomAcl',
        {
            description:
                'Change a gateway custom ACL. Only the listed fields change; the controller needs the complete entry, so the rest comes from the current entry. Defaults to a preview; set dryRun:false to apply once and verify by readback.',
            inputSchema: inputSchema.shape,
            annotations: { destructiveHint: true },
        },
        wrapMutationToolHandler<typeof inputSchema.shape>(
            'updateGatewayCustomAcl',
            mutationSummary('update-gateway-custom-acl', (args) => String(args.aclId)),
            async ({ aclId, changes, siteId, customHeaders, dryRun }) => {
                const list = () => allPages((page, size) => client.getOsgCustomAclList(page, size, siteId, customHeaders));
                const current = findRecord(await list(), aclId);
                if (!current) throw new Error(`No gateway custom ACL with id "${aclId}" exists. List them again to get a current id.`);
                const entry = gatewayCustomACLModifyEntitySchema.parse({
                    ...(pickBySchema(gatewayCustomACLModifyEntitySchema, current) as RecordLike),
                    ...changes,
                    id: aclId,
                });
                return await runUpdate({
                    spec: { label: 'gateway custom ACL', list, nameKey: 'description' },
                    id: aclId,
                    payload: entry as RecordLike,
                    dryRun,
                    write: () => client.updateGatewayCustomAcls({ modifies: [entry] }, siteId, customHeaders),
                });
            }
        )
    );
}
