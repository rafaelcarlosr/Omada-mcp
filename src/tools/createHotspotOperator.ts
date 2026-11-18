import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import type { OmadaClient } from '../omadaClient/index.js';
import { hotspotOperator06Schema } from '../omadaClient/requestSchemas.js';
import { siteInputSchema, wrapMutationToolHandler } from '../server/common.js';
import { withoutPassword } from './hotspotAccountShared.js';
import { dryRunSchema, mutationSummary, runCreate } from './resourceMutationShared.js';

const inputSchema = siteInputSchema.extend({
    payload: hotspotOperator06Schema.describe(
        'Hotspot operator (official Hotspot Operator): name, password (the controller requires a complex password, e.g. with a special character), operatorRoleType (0 administrator, 1 viewer) and selectedSites.'
    ),
    dryRun: dryRunSchema,
});

type Client = Pick<OmadaClient, 'createHotspotOperator' | 'listHotspotOperators'>;

export function registerCreateHotspotOperatorTool(server: McpServer, client: Client): void {
    server.registerTool(
        'createHotspotOperator',
        {
            description:
                'Create a hotspot operator account that can manage vouchers and portal users on the selected sites. The password is write-only and not verified by readback. Defaults to a preview; set dryRun:false to apply once and verify by readback.',
            inputSchema: inputSchema.shape,
            annotations: { destructiveHint: true },
        },
        wrapMutationToolHandler<typeof inputSchema.shape>(
            'createHotspotOperator',
            mutationSummary('create-hotspot-operator', (args) => String((args.payload as { name?: unknown }).name)),
            async ({ payload, siteId, customHeaders, dryRun }) =>
                await runCreate({
                    spec: {
                        label: 'hotspot operator',
                        list: () => client.listHotspotOperators(siteId, customHeaders),
                        normalize: withoutPassword,
                        writeOnly: ['password'],
                    },
                    payload,
                    dryRun,
                    write: () => client.createHotspotOperator(payload, siteId, customHeaders),
                })
        )
    );
}
