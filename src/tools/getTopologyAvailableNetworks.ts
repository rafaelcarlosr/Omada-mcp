import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import type { OmadaClient } from '../omadaClient/index.js';
import { siteInputSchema, toToolResult, wrapToolHandler } from '../server/common.js';

type Client = Pick<OmadaClient, 'getTopologyAvailableNetworks'>;

export function registerGetTopologyAvailableNetworksTool(server: McpServer, client: Client): void {
    server.registerTool(
        'getTopologyAvailableNetworks',
        {
            description: 'List the networks and SSIDs the topology map can filter by.',
            inputSchema: siteInputSchema.shape,
        },
        wrapToolHandler('getTopologyAvailableNetworks', async ({ siteId, customHeaders }) =>
            toToolResult(await client.getTopologyAvailableNetworks(siteId, customHeaders))
        )
    );
}
