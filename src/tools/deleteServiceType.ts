import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import type { OmadaClient } from '../omadaClient/index.js';
import { siteInputSchema, wrapMutationToolHandler } from '../server/common.js';
import { refuseBuiltInProfile } from './profileShared.js';
import { dryRunSchema, mutationSummary, runDelete } from './resourceMutationShared.js';

const inputSchema = siteInputSchema.extend({
    serviceTypeId: z.string().trim().min(1).describe('Service type ID from listServiceType.'),
    dryRun: dryRunSchema,
});

type Client = Pick<OmadaClient, 'deleteServiceType' | 'listServiceType'>;

export function registerDeleteServiceTypeTool(server: McpServer, client: Client): void {
    server.registerTool(
        'deleteServiceType',
        {
            description:
                'Delete a gateway QoS service type. Built-in service types are refused. Defaults to a preview of the record; set dryRun:false to delete and verify it is gone.',
            inputSchema: inputSchema.shape,
            annotations: { destructiveHint: true },
        },
        wrapMutationToolHandler<typeof inputSchema.shape>(
            'deleteServiceType',
            mutationSummary('delete-service-type', (args) => String(args.serviceTypeId)),
            async ({ serviceTypeId, siteId, customHeaders, dryRun }) =>
                await runDelete({
                    spec: {
                        label: 'service type',
                        list: () => client.listServiceType(1, 1000, siteId, customHeaders),
                    },
                    id: serviceTypeId,
                    dryRun,
                    guard: refuseBuiltInProfile('service type'),
                    write: () => client.deleteServiceType(serviceTypeId, siteId, customHeaders),
                    warnings: ['Gateway QoS rules that use this service type stop matching it; check where it is used first.'],
                })
        )
    );
}
