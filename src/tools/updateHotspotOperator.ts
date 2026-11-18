import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import type { OmadaClient } from '../omadaClient/index.js';
import { hotspotOperator06Schema } from '../omadaClient/requestSchemas.js';
import { siteInputSchema, wrapMutationToolHandler } from '../server/common.js';
import { withoutPassword } from './hotspotAccountShared.js';
import { dryRunSchema, mutationSummary, runUpdate } from './resourceMutationShared.js';

const inputSchema = siteInputSchema.extend({
    operatorId: z.string().trim().min(1).describe('Operator ID from listHotspotOperators.'),
    payload: hotspotOperator06Schema.describe('Complete hotspot operator (official Hotspot Operator), including the password.'),
    dryRun: dryRunSchema,
});

type Client = Pick<OmadaClient, 'listHotspotOperators' | 'updateHotspotOperator'>;

export function registerUpdateHotspotOperatorTool(server: McpServer, client: Client): void {
    server.registerTool(
        'updateHotspotOperator',
        {
            description:
                'Replace a hotspot operator (password, role or sites). Defaults to a preview; set dryRun:false to apply once and verify by readback.',
            inputSchema: inputSchema.shape,
            annotations: { destructiveHint: true },
        },
        wrapMutationToolHandler<typeof inputSchema.shape>(
            'updateHotspotOperator',
            mutationSummary('update-hotspot-operator', (args) => String(args.operatorId)),
            async ({ operatorId, payload, siteId, customHeaders, dryRun }) =>
                await runUpdate({
                    spec: {
                        label: 'hotspot operator',
                        list: () => client.listHotspotOperators(siteId, customHeaders),
                        normalize: withoutPassword,
                        writeOnly: ['password'],
                    },
                    id: operatorId,
                    payload,
                    dryRun,
                    write: () => client.updateHotspotOperator(operatorId, payload, siteId, customHeaders),
                })
        )
    );
}
