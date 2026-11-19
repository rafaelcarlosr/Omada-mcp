import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import type { OmadaClient } from '../omadaClient/index.js';
import { siteInputSchema, toToolResult, wrapToolHandler } from '../server/common.js';

type Client = Pick<OmadaClient, 'getTopologyAvailableVlans'>;

export function registerGetTopologyAvailableVlansTool(server: McpServer, client: Client): void {
    server.registerTool(
        'getTopologyAvailableVlans',
        {
            description: 'List the VLANs the topology map can filter by.',
            inputSchema: siteInputSchema.shape,
        },
        wrapToolHandler('getTopologyAvailableVlans', async ({ siteId, customHeaders }) =>
            toToolResult(await client.getTopologyAvailableVlans(siteId, customHeaders))
        )
    );
}
