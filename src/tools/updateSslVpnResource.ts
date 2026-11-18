import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import type { OmadaClient } from '../omadaClient/index.js';
import { sslVpnResourceModifyOpenApiVOSchema } from '../omadaClient/requestSchemas.js';
import { siteInputSchema, wrapMutationToolHandler } from '../server/common.js';
import { dryRunSchema, mutationSummary, runUpdate } from './resourceMutationShared.js';

const inputSchema = siteInputSchema.extend({
    resourceId: z.string().trim().min(1).describe('SSL VPN resource ID from listSslVpnResources.'),
    payload: sslVpnResourceModifyOpenApiVOSchema.describe(
        'SSL VPN resource fields (official SslVpnResourceModifyOpenApiVO); type must stay the same and the name is not accepted.'
    ),
    dryRun: dryRunSchema,
});

type Client = Pick<OmadaClient, 'listSslVpnResources' | 'updateSslVpnResource'>;

export function registerUpdateSslVpnResourceTool(server: McpServer, client: Client): void {
    server.registerTool(
        'updateSslVpnResource',
        {
            description:
                'Modify an SSL VPN resource address, protocol or ports. The name and type cannot be changed. Defaults to a preview; set dryRun:false to apply once and verify by readback.',
            inputSchema: inputSchema.shape,
            annotations: { destructiveHint: true },
        },
        wrapMutationToolHandler<typeof inputSchema.shape>(
            'updateSslVpnResource',
            mutationSummary('update-ssl-vpn-resource', (args) => String(args.resourceId)),
            async ({ resourceId, payload, siteId, customHeaders, dryRun }) =>
                await runUpdate({
                    spec: {
                        label: 'SSL VPN resource',
                        list: () => client.listSslVpnResources(siteId, customHeaders),
                    },
                    id: resourceId,
                    payload: payload,
                    dryRun,
                    write: () => client.updateSslVpnResource(resourceId, payload, siteId, customHeaders),
                })
        )
    );
}
