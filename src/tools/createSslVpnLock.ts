import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import type { OmadaClient } from '../omadaClient/index.js';
import { sslVpnLockConfigOpenApiVOSchema } from '../omadaClient/requestSchemas.js';
import { siteInputSchema, wrapMutationToolHandler } from '../server/common.js';
import { dryRunSchema, mutationSummary, runCreate } from './resourceMutationShared.js';

const inputSchema = siteInputSchema.extend({
    payload: sslVpnLockConfigOpenApiVOSchema.describe(
        'SSL VPN lock (official SslVpnLockConfigOpenApiVO): type (0 username, 1 IP), username or ip, and totalLockTime in minutes.'
    ),
    dryRun: dryRunSchema,
});

type Client = Pick<OmadaClient, 'createSslVpnLock' | 'listSslVpnLocks'>;

export function registerCreateSslVpnLockTool(server: McpServer, client: Client): void {
    server.registerTool(
        'createSslVpnLock',
        {
            description:
                'Lock an SSL VPN username (type 0) or source IP (type 1) out of the SSL VPN server for 1-1080 minutes. Defaults to a preview; set dryRun:false to apply once and verify by readback.',
            inputSchema: inputSchema.shape,
            annotations: { destructiveHint: true },
        },
        wrapMutationToolHandler<typeof inputSchema.shape>(
            'createSslVpnLock',
            mutationSummary('create-ssl-vpn-lock', (args) =>
                String((args.payload as { username?: unknown; ip?: unknown }).username ?? (args.payload as { ip?: unknown }).ip)
            ),
            async ({ payload, siteId, customHeaders, dryRun }) =>
                await runCreate({
                    spec: {
                        label: 'SSL VPN lock',
                        list: () => client.listSslVpnLocks(siteId, customHeaders),
                        nameKey: null,
                    },
                    payload: payload,
                    dryRun,
                    write: () => client.createSslVpnLock(payload, siteId, customHeaders),
                })
        )
    );
}
