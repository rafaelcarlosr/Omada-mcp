import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import type { OmadaClient } from '../omadaClient/index.js';
import { siteInputSchema, wrapMutationToolHandler } from '../server/common.js';
import { dryRunSchema, mutationSummary, runDelete } from './resourceMutationShared.js';

const inputSchema = siteInputSchema.extend({
    resourceId: z.string().trim().min(1).describe('SSL VPN resource ID from listSslVpnResources.'),
    dryRun: dryRunSchema,
});

type Client = Pick<OmadaClient, 'deleteSslVpnResource' | 'listSslVpnResources'>;

export function registerDeleteSslVpnResourceTool(server: McpServer, client: Client): void {
    server.registerTool(
        'deleteSslVpnResource',
        {
            description:
                'Delete an SSL VPN resource; it is removed from every resource group. Defaults to a preview of the record; set dryRun:false to delete and verify it is gone.',
            inputSchema: inputSchema.shape,
            annotations: { destructiveHint: true },
        },
        wrapMutationToolHandler<typeof inputSchema.shape>(
            'deleteSslVpnResource',
            mutationSummary('delete-ssl-vpn-resource', (args) => String(args.resourceId)),
            async ({ resourceId, siteId, customHeaders, dryRun }) =>
                await runDelete({
                    spec: {
                        label: 'SSL VPN resource',
                        list: () => client.listSslVpnResources(siteId, customHeaders),
                    },
                    id: resourceId,
                    dryRun,
                    write: () => client.deleteSslVpnResource(resourceId, siteId, customHeaders),
                    warnings: ['The resource is removed from every SSL VPN resource group that contains it.'],
                })
        )
    );
}
