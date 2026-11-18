import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import type { OmadaClient } from '../omadaClient/index.js';
import { siteInputSchema, wrapMutationToolHandler } from '../server/common.js';
import { withoutPassword } from './hotspotAccountShared.js';
import { dryRunSchema, mutationSummary, runCreate } from './resourceMutationShared.js';
import { vpnUserPayloadSchema } from './vpnShared.js';

const inputSchema = siteInputSchema.extend({
    payload: vpnUserPayloadSchema.describe(
        'VPN user (official VpnUserConfigVO): username, password and protocol are required; servers, clientMode, maxConnections, userRemoteSubnets and localIp apply to L2TP/PPTP and OpenVPN; groupId, status and validity to SSL VPN.'
    ),
    dryRun: dryRunSchema,
});

type Client = Pick<OmadaClient, 'createVpnUser' | 'listVpnUsers'>;

export function registerCreateVpnUserTool(server: McpServer, client: Client): void {
    server.registerTool(
        'createVpnUser',
        {
            description:
                'Create a VPN user account for L2TP/PPTP (protocol 0), OpenVPN (1) or SSL VPN (2, with groupId, status and validity MM/DD/YYYY). Servers are optional. The password is write-only and not verified by readback. Defaults to a preview; set dryRun:false to apply once and verify by readback.',
            inputSchema: inputSchema.shape,
            annotations: { destructiveHint: true },
        },
        wrapMutationToolHandler<typeof inputSchema.shape>(
            'createVpnUser',
            mutationSummary('create-vpn-user', (args) => String((args.payload as { username?: unknown }).username)),
            async ({ payload, siteId, customHeaders, dryRun }) =>
                await runCreate({
                    spec: {
                        label: 'VPN user',
                        list: () => client.listVpnUsers(siteId, customHeaders),
                        nameKey: 'username',
                        normalize: withoutPassword,
                        writeOnly: ['password'],
                    },
                    payload: payload,
                    dryRun,
                    write: () => client.createVpnUser(payload, siteId, customHeaders),
                })
        )
    );
}
