import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import type { OmadaClient } from '../omadaClient/index.js';
import { siteInputSchema, wrapMutationToolHandler } from '../server/common.js';
import { withoutPassword } from './hotspotAccountShared.js';
import { dryRunSchema, mutationSummary, runDelete } from './resourceMutationShared.js';

const inputSchema = siteInputSchema.extend({
    operatorId: z.string().trim().min(1).describe('Operator ID from listHotspotOperators.'),
    dryRun: dryRunSchema,
});

type Client = Pick<OmadaClient, 'deleteHotspotOperator' | 'listHotspotOperators'>;

export function registerDeleteHotspotOperatorTool(server: McpServer, client: Client): void {
    server.registerTool(
        'deleteHotspotOperator',
        {
            description: 'Delete a hotspot operator account. Defaults to a preview of the record; set dryRun:false to delete and verify it is gone.',
            inputSchema: inputSchema.shape,
            annotations: { destructiveHint: true },
        },
        wrapMutationToolHandler<typeof inputSchema.shape>(
            'deleteHotspotOperator',
            mutationSummary('delete-hotspot-operator', (args) => String(args.operatorId)),
            async ({ operatorId, siteId, customHeaders, dryRun }) =>
                await runDelete({
                    spec: {
                        label: 'hotspot operator',
                        list: () => client.listHotspotOperators(siteId, customHeaders),
                        normalize: withoutPassword,
                        writeOnly: ['password'],
                    },
                    id: operatorId,
                    dryRun,
                    write: () => client.deleteHotspotOperator(operatorId, siteId, customHeaders),
                })
        )
    );
}
