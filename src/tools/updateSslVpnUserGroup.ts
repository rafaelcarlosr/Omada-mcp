import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import type { OmadaClient } from '../omadaClient/index.js';
import { sslVpnUserGroupModifyOpenApiVOSchema } from '../omadaClient/requestSchemas.js';
import { siteInputSchema, wrapMutationToolHandler } from '../server/common.js';
import { dryRunSchema, mutationSummary, runUpdate } from './resourceMutationShared.js';
import { withSortedIds } from './vpnShared.js';

const inputSchema = siteInputSchema.extend({
    groupId: z.string().trim().min(1).describe('SSL VPN user group ID from listSslVpnUserGroups.'),
    payload: sslVpnUserGroupModifyOpenApiVOSchema.describe(
        'SSL VPN user group fields (official SslVpnUserGroupModifyOpenApiVO): resourceGroupList, radiusAttribute, ldapAttribute.'
    ),
    dryRun: dryRunSchema,
});

type Client = Pick<OmadaClient, 'listSslVpnUserGroups' | 'updateSslVpnUserGroup'>;

export function registerUpdateSslVpnUserGroupTool(server: McpServer, client: Client): void {
    server.registerTool(
        'updateSslVpnUserGroup',
        {
            description:
                'Replace the resource groups or RADIUS/LDAP attribute of an SSL VPN user group. The name cannot be changed. Defaults to a preview; set dryRun:false to apply once and verify by readback.',
            inputSchema: inputSchema.shape,
            annotations: { destructiveHint: true },
        },
        wrapMutationToolHandler<typeof inputSchema.shape>(
            'updateSslVpnUserGroup',
            mutationSummary('update-ssl-vpn-user-group', (args) => String(args.groupId)),
            async ({ groupId, payload, siteId, customHeaders, dryRun }) => {
                const body = withSortedIds(payload, 'resourceGroupList');
                return await runUpdate({
                    spec: {
                        label: 'SSL VPN user group',
                        list: () => client.listSslVpnUserGroups(siteId, customHeaders),
                        normalize: (record) => withSortedIds(record, 'resourceGroupList'),
                    },
                    id: groupId,
                    payload: body,
                    dryRun,
                    write: () => client.updateSslVpnUserGroup(groupId, body, siteId, customHeaders),
                });
            }
        )
    );
}
