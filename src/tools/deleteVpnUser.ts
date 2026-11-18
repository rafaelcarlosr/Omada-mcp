import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import type { OmadaClient } from '../omadaClient/index.js';
import { siteInputSchema, wrapMutationToolHandler } from '../server/common.js';
import { withoutPassword } from './hotspotAccountShared.js';
import { dryRunSchema, mutationSummary, runDelete } from './resourceMutationShared.js';

const inputSchema = siteInputSchema.extend({
    userId: z.string().trim().min(1).describe('VPN user ID from listVpnUsers.'),
    dryRun: dryRunSchema,
});

type Client = Pick<OmadaClient, 'deleteVpnUser' | 'listVpnUsers'>;

export function registerDeleteVpnUserTool(server: McpServer, client: Client): void {
    server.registerTool(
        'deleteVpnUser',
        {
            description:
                'Delete a VPN user account; its active VPN sessions end. Defaults to a preview of the record; set dryRun:false to delete and verify it is gone.',
            inputSchema: inputSchema.shape,
            annotations: { destructiveHint: true },
        },
        wrapMutationToolHandler<typeof inputSchema.shape>(
            'deleteVpnUser',
            mutationSummary('delete-vpn-user', (args) => String(args.userId)),
            async ({ userId, siteId, customHeaders, dryRun }) =>
                await runDelete({
                    spec: {
                        label: 'VPN user',
                        list: () => client.listVpnUsers(siteId, customHeaders),
                        nameKey: 'username',
                        normalize: withoutPassword,
                        writeOnly: ['password'],
                    },
                    id: userId,
                    dryRun,
                    write: () => client.deleteVpnUser(userId, siteId, customHeaders),
                    warnings: ['Active VPN sessions of this user are disconnected.'],
                })
        )
    );
}
