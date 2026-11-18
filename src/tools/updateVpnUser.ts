import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import type { OmadaClient } from '../omadaClient/index.js';
import { siteInputSchema, wrapMutationToolHandler } from '../server/common.js';
import { withoutPassword } from './hotspotAccountShared.js';
import { dryRunSchema, mutationSummary, runUpdate } from './resourceMutationShared.js';
import { vpnUserPayloadSchema } from './vpnShared.js';

const inputSchema = siteInputSchema.extend({
    userId: z.string().trim().min(1).describe('VPN user ID from listVpnUsers.'),
    payload: vpnUserPayloadSchema.describe('Complete VPN user (official VpnUserConfigVO), including username, password and protocol.'),
    dryRun: dryRunSchema,
});

type Client = Pick<OmadaClient, 'listVpnUsers' | 'updateVpnUser'>;

export function registerUpdateVpnUserTool(server: McpServer, client: Client): void {
    server.registerTool(
        'updateVpnUser',
        {
            description:
                'Replace a VPN user account (username, password, protocol, servers, limits). The controller needs the complete account, including the password. Defaults to a preview; set dryRun:false to apply once and verify by readback.',
            inputSchema: inputSchema.shape,
            annotations: { destructiveHint: true },
        },
        wrapMutationToolHandler<typeof inputSchema.shape>(
            'updateVpnUser',
            mutationSummary('update-vpn-user', (args) => String(args.userId)),
            async ({ userId, payload, siteId, customHeaders, dryRun }) =>
                await runUpdate({
                    spec: {
                        label: 'VPN user',
                        list: () => client.listVpnUsers(siteId, customHeaders),
                        nameKey: 'username',
                        normalize: withoutPassword,
                        writeOnly: ['password'],
                    },
                    id: userId,
                    payload: payload,
                    dryRun,
                    write: () => client.updateVpnUser(userId, payload, siteId, customHeaders),
                })
        )
    );
}
