import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import type { OmadaClient } from '../omadaClient/index.js';
import { sslVpnResourceGroupConfigOpenApiVOSchema } from '../omadaClient/requestSchemas.js';
import { siteInputSchema, wrapMutationToolHandler } from '../server/common.js';
import { dryRunSchema, mutationSummary, runCreate } from './resourceMutationShared.js';
import { withSortedIds } from './vpnShared.js';

const inputSchema = siteInputSchema.extend({
    payload: sslVpnResourceGroupConfigOpenApiVOSchema.describe(
        'SSL VPN resource group (official SslVpnResourceGroupConfigOpenApiVO): name and resourcesList (resource IDs from listSslVpnResources).'
    ),
    dryRun: dryRunSchema,
});

type Client = Pick<OmadaClient, 'createSslVpnResourceGroup' | 'listSslVpnResourceGroups'>;

export function registerCreateSslVpnResourceGroupTool(server: McpServer, client: Client): void {
    server.registerTool(
        'createSslVpnResourceGroup',
        {
            description:
                'Create an SSL VPN resource group from SSL VPN resource IDs. Defaults to a preview; set dryRun:false to apply once and verify by readback.',
            inputSchema: inputSchema.shape,
            annotations: { destructiveHint: true },
        },
        wrapMutationToolHandler<typeof inputSchema.shape>(
            'createSslVpnResourceGroup',
            mutationSummary('create-ssl-vpn-resource-group', (args) => String((args.payload as { name?: unknown }).name)),
            async ({ payload, siteId, customHeaders, dryRun }) => {
                const body = withSortedIds(payload, 'resourcesList');
                return await runCreate({
                    spec: {
                        label: 'SSL VPN resource group',
                        list: () => client.listSslVpnResourceGroups(siteId, customHeaders),
                        normalize: (record) => withSortedIds(record, 'resourcesList'),
                    },
                    payload: body,
                    dryRun,
                    write: () => client.createSslVpnResourceGroup(body, siteId, customHeaders),
                });
            }
        )
    );
}
