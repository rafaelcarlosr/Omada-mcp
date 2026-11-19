import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import type { OmadaClient } from '../omadaClient/index.js';
import { topologyRootNodeSchema } from '../omadaClient/topology.js';
import { siteInputSchema, wrapMutationToolHandler } from '../server/common.js';
import { dryRunSchema, mutationSummary, runAction } from './resourceMutationShared.js';

const inputSchema = siteInputSchema.extend({
    payload: topologyRootNodeSchema.describe(
        'Root node: type (switch, olt or other), mac, or specificType with macList for an M-LAG/VRRP pair, and discoveryMode (0 manual, 1 automatic).'
    ),
    dryRun: dryRunSchema,
});

type Client = Pick<OmadaClient, 'listTopologyNodes' | 'setTopologyRootNode'>;

export function registerSetTopologyRootNodeTool(server: McpServer, client: Client): void {
    server.registerTool(
        'setTopologyRootNode',
        {
            description:
                'Choose the device drawn at the top of the site topology map, or return to automatic discovery. It changes only the map, not the network. Defaults to a preview with the candidate nodes; set dryRun:false to apply.',
            inputSchema: inputSchema.shape,
            annotations: { destructiveHint: false },
        },
        wrapMutationToolHandler<typeof inputSchema.shape>(
            'setTopologyRootNode',
            mutationSummary('set-topology-root-node', (args) =>
                String((args.payload as { mac?: unknown; type?: unknown }).mac ?? (args.payload as { type?: unknown }).type)
            ),
            async ({ payload, siteId, customHeaders, dryRun }) =>
                await runAction({
                    label: 'topology root node',
                    dryRun,
                    preflight: async () => {
                        if (payload.discoveryMode !== 1 && !payload.mac && !payload.macList?.length) {
                            throw new Error('A manual root node needs mac or macList. No request was sent.');
                        }
                        return { requested: payload, candidates: await client.listTopologyNodes(siteId, customHeaders) };
                    },
                    write: () => client.setTopologyRootNode(payload, siteId, customHeaders),
                })
        )
    );
}
