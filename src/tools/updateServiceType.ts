import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import type { OmadaClient } from '../omadaClient/index.js';
import { serviceTypePayloadSchema } from '../omadaClient/profiles.js';
import { siteInputSchema, wrapMutationToolHandler } from '../server/common.js';
import { refuseBuiltInProfile } from './profileShared.js';
import { dryRunSchema, mutationSummary, runUpdate } from './resourceMutationShared.js';

const inputSchema = siteInputSchema.extend({
    serviceTypeId: z.string().trim().min(1).describe('Service type ID from listServiceType.'),
    payload: serviceTypePayloadSchema.describe('Complete service type (official GatewayQosServiceOpenApiVO) with only the fields of its protocol.'),
    dryRun: dryRunSchema,
});

type Client = Pick<OmadaClient, 'listServiceType' | 'updateServiceType'>;

export function registerUpdateServiceTypeTool(server: McpServer, client: Client): void {
    server.registerTool(
        'updateServiceType',
        {
            description:
                'Replace a gateway QoS service type. Built-in service types (ALL, FTP, SSH and others) are refused. Defaults to a preview; set dryRun:false to apply once and verify by readback.',
            inputSchema: inputSchema.shape,
            annotations: { destructiveHint: true },
        },
        wrapMutationToolHandler<typeof inputSchema.shape>(
            'updateServiceType',
            mutationSummary('update-service-type', (args) => String(args.serviceTypeId)),
            async ({ serviceTypeId, payload, siteId, customHeaders, dryRun }) =>
                await runUpdate({
                    spec: {
                        label: 'service type',
                        list: () => client.listServiceType(1, 1000, siteId, customHeaders),
                    },
                    id: serviceTypeId,
                    payload,
                    dryRun,
                    guard: refuseBuiltInProfile('service type'),
                    write: () => client.updateServiceType(serviceTypeId, payload, siteId, customHeaders),
                })
        )
    );
}
