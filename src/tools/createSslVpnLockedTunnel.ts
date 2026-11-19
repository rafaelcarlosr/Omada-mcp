import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import type { OmadaClient } from '../omadaClient/index.js';
import { sslVpnLockCreateAndModifyOpenApiVOSchema } from '../omadaClient/requestSchemas.js';
import { siteInputSchema, wrapMutationToolHandler } from '../server/common.js';
import { dryRunSchema, mutationSummary, type RecordLike, runCreate } from './resourceMutationShared.js';
import { checkSslVpnLock } from './vpnShared.js';

const inputSchema = siteInputSchema.extend({
    payload: sslVpnLockCreateAndModifyOpenApiVOSchema.describe(
        'Lock (official SslVpnLockCreateAndModifyOpenApiVO): type 0 with username or type 1 with ip, and totalLockTime in minutes (1-1080).'
    ),
    dryRun: dryRunSchema,
});

type Client = Pick<OmadaClient, 'createSslVpnLockedTunnel' | 'listSslVpnLockedTunnels'>;

export function registerCreateSslVpnLockedTunnelTool(server: McpServer, client: Client): void {
    server.registerTool(
        'createSslVpnLockedTunnel',
        {
            description:
                'Lock SSL VPN access for a user name or source IP for a number of minutes. Defaults to a preview; set dryRun:false to create once and verify by readback.',
            inputSchema: inputSchema.shape,
            annotations: { destructiveHint: true },
        },
        wrapMutationToolHandler<typeof inputSchema.shape>(
            'createSslVpnLockedTunnel',
            mutationSummary('create-ssl-vpn-locked-tunnel', (args) =>
                String((args.payload as { username?: unknown; ip?: unknown }).username ?? (args.payload as { ip?: unknown }).ip)
            ),
            async ({ payload, siteId, customHeaders, dryRun }) => {
                checkSslVpnLock(payload);
                return await runCreate({
                    spec: { label: 'locked SSL VPN tunnel', list: () => client.listSslVpnLockedTunnels(siteId, customHeaders), nameKey: null },
                    payload: payload as RecordLike,
                    dryRun,
                    write: () => client.createSslVpnLockedTunnel(payload, siteId, customHeaders),
                    warnings: ['The locked user or IP cannot open SSL VPN tunnels until the lock expires or is deleted.'],
                });
            }
        )
    );
}
