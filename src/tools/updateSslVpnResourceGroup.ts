import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import type { OmadaClient } from '../omadaClient/index.js';
import { sslVpnResourceGroupModifyOpenApiVOSchema } from '../omadaClient/requestSchemas.js';
import { siteInputSchema, wrapMutationToolHandler } from '../server/common.js';
import { dryRunSchema, mutationSummary, runUpdate } from './resourceMutationShared.js';
import { BUILT_IN_SSL_VPN_RESOURCE_GROUPS, withSortedIds } from './vpnShared.js';

const inputSchema = siteInputSchema.extend({
    groupId: z.string().trim().min(1).describe('SSL VPN resource group ID from listSslVpnResourceGroups.'),
    payload: sslVpnResourceGroupModifyOpenApiVOSchema.describe(
        'SSL VPN resource group fields (official SslVpnResourceGroupModifyOpenApiVO): resourcesList.'
    ),
    dryRun: dryRunSchema,
});

type Client = Pick<OmadaClient, 'listSslVpnResourceGroups' | 'updateSslVpnResourceGroup'>;

function refuseBuiltIn(groupId: string): void {
    if (BUILT_IN_SSL_VPN_RESOURCE_GROUPS.includes(groupId)) {
        throw new Error(`"${groupId}" is a built-in SSL VPN resource group and cannot be changed or deleted.`);
    }
}

export function registerUpdateSslVpnResourceGroupTool(server: McpServer, client: Client): void {
    server.registerTool(
        'updateSslVpnResourceGroup',
        {
            description:
                'Replace the resources of an SSL VPN resource group. The name cannot be changed, and the built-in Group_ALL and Group_LAN are refused. Defaults to a preview; set dryRun:false to apply once and verify by readback.',
            inputSchema: inputSchema.shape,
            annotations: { destructiveHint: true },
        },
        wrapMutationToolHandler<typeof inputSchema.shape>(
            'updateSslVpnResourceGroup',
            mutationSummary('update-ssl-vpn-resource-group', (args) => String(args.groupId)),
            async ({ groupId, payload, siteId, customHeaders, dryRun }) => {
                refuseBuiltIn(groupId);
                const body = withSortedIds(payload, 'resourcesList');
                return await runUpdate({
                    spec: {
                        label: 'SSL VPN resource group',
                        list: () => client.listSslVpnResourceGroups(siteId, customHeaders),
                        normalize: (record) => withSortedIds(record, 'resourcesList'),
                    },
                    id: groupId,
                    payload: body,
                    dryRun,
                    write: () => client.updateSslVpnResourceGroup(groupId, body, siteId, customHeaders),
                });
            }
        )
    );
}
