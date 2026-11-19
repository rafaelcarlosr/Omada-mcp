import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import type { OmadaClient } from '../omadaClient/index.js';
import { siteLagHashAlgOpenApiVOSchema } from '../omadaClient/requestSchemas.js';
import { siteInputSchema, wrapMutationToolHandler } from '../server/common.js';
import { dryRunSchema, mutationSummary, runSettings } from './resourceMutationShared.js';

const inputSchema = siteInputSchema.extend({
    payload: siteLagHashAlgOpenApiVOSchema.describe('LAG hash setting (official SiteLagHashAlgOpenApiVO): type 0-5.'),
    dryRun: dryRunSchema,
});

type Client = Pick<OmadaClient, 'getSiteLagHashAlgorithm' | 'setSiteLagHashAlgorithm'>;

export function registerSetSiteLagHashAlgorithmTool(server: McpServer, client: Client): void {
    server.registerTool(
        'setSiteLagHashAlgorithm',
        {
            description:
                'Set how switches in the site spread traffic over LAG members: 0 source MAC, 1 destination MAC, 2 both MACs, 3 source IP, 4 destination IP, 5 both IPs. Defaults to a preview of the current setting and differences; set dryRun:false to apply once and verify by readback.',
            inputSchema: inputSchema.shape,
            annotations: { destructiveHint: true },
        },
        wrapMutationToolHandler<typeof inputSchema.shape>(
            'setSiteLagHashAlgorithm',
            mutationSummary('set-site-lag-hash-algorithm', (args) => args.siteId ?? 'default-site'),
            async ({ payload, siteId, customHeaders, dryRun }) =>
                await runSettings({
                    label: 'LAG hash algorithm',
                    read: () => client.getSiteLagHashAlgorithm(siteId, customHeaders),
                    payload,
                    dryRun,
                    write: () => client.setSiteLagHashAlgorithm(payload, siteId, customHeaders),
                    warnings: ['Switches rebalance LAG traffic, which can briefly reorder flows.'],
                })
        )
    );
}
