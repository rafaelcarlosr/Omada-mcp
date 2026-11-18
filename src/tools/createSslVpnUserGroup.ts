import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import type { OmadaClient } from '../omadaClient/index.js';
import { sslVpnUserGroupConfigOpenApiVOSchema } from '../omadaClient/requestSchemas.js';
import { siteInputSchema, wrapMutationToolHandler } from '../server/common.js';
import { dryRunSchema, mutationSummary, runCreate } from './resourceMutationShared.js';
import { withSortedIds } from './vpnShared.js';

const inputSchema = siteInputSchema.extend({
    payload: sslVpnUserGroupConfigOpenApiVOSchema.describe(
        'SSL VPN user group (official SslVpnUserGroupConfigOpenApiVO): name, resourceGroupList (IDs from listSslVpnResourceGroups) and optional RADIUS or LDAP attribute.'
    ),
    dryRun: dryRunSchema,
});

type Client = Pick<OmadaClient, 'createSslVpnUserGroup' | 'listSslVpnUserGroups'>;

export function registerCreateSslVpnUserGroupTool(server: McpServer, client: Client): void {
    server.registerTool(
        'createSslVpnUserGroup',
        {
            description:
                'Create an SSL VPN user group that grants its users the listed resource groups. Defaults to a preview; set dryRun:false to apply once and verify by readback.',
            inputSchema: inputSchema.shape,
            annotations: { destructiveHint: true },
        },
        wrapMutationToolHandler<typeof inputSchema.shape>(
            'createSslVpnUserGroup',
            mutationSummary('create-ssl-vpn-user-group', (args) => String((args.payload as { name?: unknown }).name)),
            async ({ payload, siteId, customHeaders, dryRun }) => {
                const body = withSortedIds(payload, 'resourceGroupList');
                return await runCreate({
                    spec: {
                        label: 'SSL VPN user group',
                        list: () => client.listSslVpnUserGroups(siteId, customHeaders),
                        normalize: (record) => withSortedIds(record, 'resourceGroupList'),
                    },
                    payload: body,
                    dryRun,
                    write: () => client.createSslVpnUserGroup(body, siteId, customHeaders),
                });
            }
        )
    );
}
