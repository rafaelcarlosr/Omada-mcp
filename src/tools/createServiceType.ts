import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import type { OmadaClient } from '../omadaClient/index.js';
import { serviceTypePayloadSchema } from '../omadaClient/profiles.js';
import { siteInputSchema, wrapMutationToolHandler } from '../server/common.js';
import { dryRunSchema, mutationSummary, runCreate } from './resourceMutationShared.js';

const inputSchema = siteInputSchema.extend({
    payload: serviceTypePayloadSchema.describe(
        'Service type (official GatewayQosServiceOpenApiVO): name, protocol (0 TCP, 1 UDP, 2 TCP/UDP with all four port fields; 3 ICMP with type and code; 4 Other with protoNum) and optional description.'
    ),
    dryRun: dryRunSchema,
});

type Client = Pick<OmadaClient, 'createServiceType' | 'listServiceType'>;

export function registerCreateServiceTypeTool(server: McpServer, client: Client): void {
    server.registerTool(
        'createServiceType',
        {
            description:
                'Create a gateway QoS service type (protocol with port ranges, ICMP type/code or IP protocol number) for gateway QoS rules. Defaults to a preview; set dryRun:false to apply once and verify by readback.',
            inputSchema: inputSchema.shape,
            annotations: { destructiveHint: true },
        },
        wrapMutationToolHandler<typeof inputSchema.shape>(
            'createServiceType',
            mutationSummary('create-service-type', (args) => String((args.payload as { name?: unknown }).name)),
            async ({ payload, siteId, customHeaders, dryRun }) =>
                await runCreate({
                    spec: {
                        label: 'service type',
                        list: () => client.listServiceType(1, 1000, siteId, customHeaders),
                    },
                    payload,
                    dryRun,
                    write: () => client.createServiceType(payload, siteId, customHeaders),
                })
        )
    );
}
