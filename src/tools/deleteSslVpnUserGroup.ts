import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import type { OmadaClient } from '../omadaClient/index.js';
import { siteInputSchema, wrapMutationToolHandler } from '../server/common.js';
import { dryRunSchema, mutationSummary, runDelete } from './resourceMutationShared.js';
import { withSortedIds } from './vpnShared.js';

const inputSchema = siteInputSchema.extend({
    groupId: z.string().trim().min(1).describe('SSL VPN user group ID from listSslVpnUserGroups.'),
    dryRun: dryRunSchema,
});

type Client = Pick<OmadaClient, 'deleteSslVpnUserGroup' | 'listSslVpnUserGroups'>;

export function registerDeleteSslVpnUserGroupTool(server: McpServer, client: Client): void {
    server.registerTool(
        'deleteSslVpnUserGroup',
        {
            description:
                'Delete an SSL VPN user group. The controller accepts this even while users belong to it, and those users lose its resources. Defaults to a preview of the record; set dryRun:false to delete and verify it is gone.',
            inputSchema: inputSchema.shape,
            annotations: { destructiveHint: true },
        },
        wrapMutationToolHandler<typeof inputSchema.shape>(
            'deleteSslVpnUserGroup',
            mutationSummary('delete-ssl-vpn-user-group', (args) => String(args.groupId)),
            async ({ groupId, siteId, customHeaders, dryRun }) =>
                await runDelete({
                    spec: {
                        label: 'SSL VPN user group',
                        list: () => client.listSslVpnUserGroups(siteId, customHeaders),
                        normalize: (record) => withSortedIds(record, 'resourceGroupList'),
                    },
                    id: groupId,
                    dryRun,
                    write: () => client.deleteSslVpnUserGroup(groupId, siteId, customHeaders),
                    warnings: ['Omada 6.3 deletes the group even when SSL VPN users belong to it; check userNumber in the preview first.'],
                })
        )
    );
}
