import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import type { OmadaClient } from '../omadaClient/index.js';
import { gatewayCustomACLAddEntitySchema } from '../omadaClient/requestSchemas.js';
import { siteInputSchema, wrapMutationToolHandler } from '../server/common.js';
import { allPages } from './ipsShared.js';
import { dryRunSchema, mutationSummary, type RecordLike, runCreate } from './resourceMutationShared.js';

const inputSchema = siteInputSchema.extend({
    payload: gatewayCustomACLAddEntitySchema
        .omit({ index: true })
        .describe(
            'Custom ACL (official GatewayCustomACLAddEntity): status, description, direction (0 LAN-LAN, 1 LAN-WAN, 2 WAN-LAN, 3 local in), policy (0 drop, 1 allow), protocol number, sourceList and destinationList (IPs or subnets), optional ports for TCP/UDP, logStatus.'
        ),
    position: z.number().int().min(1).optional().describe('1-based position; appended last when omitted.'),
    dryRun: dryRunSchema,
});

type Client = Pick<OmadaClient, 'getOsgCustomAclList' | 'updateGatewayCustomAcls'>;

export function registerCreateGatewayCustomAclTool(server: McpServer, client: Client): void {
    server.registerTool(
        'createGatewayCustomAcl',
        {
            description:
                'Create a gateway custom ACL from addresses and subnets. Defaults to a preview; set dryRun:false to create once and verify by readback.',
            inputSchema: inputSchema.shape,
            annotations: { destructiveHint: true },
        },
        wrapMutationToolHandler<typeof inputSchema.shape>(
            'createGatewayCustomAcl',
            mutationSummary('create-gateway-custom-acl', (args) => String((args.payload as { description?: unknown }).description)),
            async ({ payload, position, siteId, customHeaders, dryRun }) => {
                const list = () => allPages((page, size) => client.getOsgCustomAclList(page, size, siteId, customHeaders));
                const entry = gatewayCustomACLAddEntitySchema.parse({ ...payload, index: position ?? (await list()).length + 1 });
                return await runCreate({
                    spec: { label: 'gateway custom ACL', list, nameKey: 'description' },
                    payload: entry as RecordLike,
                    dryRun,
                    write: () => client.updateGatewayCustomAcls({ adds: [entry] }, siteId, customHeaders),
                });
            }
        )
    );
}
