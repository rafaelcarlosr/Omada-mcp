import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import type { OmadaClient } from '../omadaClient/index.js';
import { siteInputSchema, wrapMutationToolHandler } from '../server/common.js';
import { dryRunSchema, mutationSummary, runAction } from './resourceMutationShared.js';

const inputSchema = siteInputSchema.extend({
    dryRun: dryRunSchema,
});

type Client = Pick<OmadaClient, 'getTopologyDiscoveryStatus' | 'refreshTopology'>;

export function registerRefreshTopologyTool(server: McpServer, client: Client): void {
    server.registerTool(
        'refreshTopology',
        {
            description:
                'Ask the controller to rediscover the site topology from the devices. It changes no device configuration. Defaults to a preview with the current discovery status; set dryRun:false to start it.',
            inputSchema: inputSchema.shape,
            annotations: { destructiveHint: false },
        },
        wrapMutationToolHandler<typeof inputSchema.shape>(
            'refreshTopology',
            mutationSummary('refresh-topology', () => 'site'),
            async ({ siteId, customHeaders, dryRun }) =>
                await runAction({
                    label: 'topology refresh',
                    dryRun,
                    preflight: async () => ({ discovery: await client.getTopologyDiscoveryStatus(siteId, customHeaders) }),
                    write: () => client.refreshTopology(siteId, customHeaders),
                })
        )
    );
}
