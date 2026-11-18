import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import type { OmadaClient } from '../omadaClient/index.js';
import { sslVpnResourceConfigOpenApiVOSchema } from '../omadaClient/requestSchemas.js';
import { siteInputSchema, wrapMutationToolHandler } from '../server/common.js';
import { dryRunSchema, mutationSummary, runCreate } from './resourceMutationShared.js';

const inputSchema = siteInputSchema.extend({
    payload: sslVpnResourceConfigOpenApiVOSchema.describe(
        'SSL VPN resource (official SslVpnResourceConfigOpenApiVO): name, type (0 IP with ip and mask, 1 domain) and protocol (0 all, 1 TCP, 2 UDP, 3 TCP/UDP, 4 ICMP, 5 other) with its ports or ICMP fields.'
    ),
    dryRun: dryRunSchema,
});

type Client = Pick<OmadaClient, 'createSslVpnResource' | 'listSslVpnResources'>;

export function registerCreateSslVpnResourceTool(server: McpServer, client: Client): void {
    server.registerTool(
        'createSslVpnResource',
        {
            description:
                'Create an SSL VPN resource: an IP subnet (type 0) or domain (type 1) with an optional protocol and port range that SSL VPN users may reach. Defaults to a preview; set dryRun:false to apply once and verify by readback.',
            inputSchema: inputSchema.shape,
            annotations: { destructiveHint: true },
        },
        wrapMutationToolHandler<typeof inputSchema.shape>(
            'createSslVpnResource',
            mutationSummary('create-ssl-vpn-resource', (args) => String((args.payload as { name?: unknown }).name)),
            async ({ payload, siteId, customHeaders, dryRun }) =>
                await runCreate({
                    spec: {
                        label: 'SSL VPN resource',
                        list: () => client.listSslVpnResources(siteId, customHeaders),
                    },
                    payload: payload,
                    dryRun,
                    write: () => client.createSslVpnResource(payload, siteId, customHeaders),
                })
        )
    );
}
