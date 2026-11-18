import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import type { OmadaClient } from '../omadaClient/index.js';
import { siteInputSchema, wrapMutationToolHandler } from '../server/common.js';
import { dryRunSchema, mutationSummary, runDelete } from './resourceMutationShared.js';
import { BUILT_IN_SSL_VPN_RESOURCE_GROUPS, withSortedIds } from './vpnShared.js';

const inputSchema = siteInputSchema.extend({
    groupId: z.string().trim().min(1).describe('SSL VPN resource group ID from listSslVpnResourceGroups.'),
    dryRun: dryRunSchema,
});

type Client = Pick<OmadaClient, 'deleteSslVpnResourceGroup' | 'listSslVpnResourceGroups'>;

function refuseBuiltIn(groupId: string): void {
    if (BUILT_IN_SSL_VPN_RESOURCE_GROUPS.includes(groupId)) {
        throw new Error(`"${groupId}" is a built-in SSL VPN resource group and cannot be changed or deleted.`);
    }
}

export function registerDeleteSslVpnResourceGroupTool(server: McpServer, client: Client): void {
    server.registerTool(
        'deleteSslVpnResourceGroup',
        {
            description:
                'Delete an SSL VPN resource group; user groups lose access to its resources. The built-in Group_ALL and Group_LAN are refused. Defaults to a preview of the record; set dryRun:false to delete and verify it is gone.',
            inputSchema: inputSchema.shape,
            annotations: { destructiveHint: true },
        },
        wrapMutationToolHandler<typeof inputSchema.shape>(
            'deleteSslVpnResourceGroup',
            mutationSummary('delete-ssl-vpn-resource-group', (args) => String(args.groupId)),
            async ({ groupId, siteId, customHeaders, dryRun }) => {
                refuseBuiltIn(groupId);
                return await runDelete({
                    spec: {
                        label: 'SSL VPN resource group',
                        list: () => client.listSslVpnResourceGroups(siteId, customHeaders),
                        normalize: (record) => withSortedIds(record, 'resourcesList'),
                    },
                    id: groupId,
                    dryRun,
                    write: () => client.deleteSslVpnResourceGroup(groupId, siteId, customHeaders),
                    warnings: ['SSL VPN user groups that reference this resource group lose access to its resources.'],
                });
            }
        )
    );
}
