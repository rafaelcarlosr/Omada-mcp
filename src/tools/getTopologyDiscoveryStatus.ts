import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import type { OmadaClient } from '../omadaClient/index.js';
import { siteInputSchema, toToolResult, wrapToolHandler } from '../server/common.js';

type Client = Pick<OmadaClient, 'getTopologyDiscoveryStatus'>;

export function registerGetTopologyDiscoveryStatusTool(server: McpServer, client: Client): void {
    server.registerTool(
        'getTopologyDiscoveryStatus',
        {
            description: 'Get whether a topology discovery is running.',
            inputSchema: siteInputSchema.shape,
        },
        wrapToolHandler('getTopologyDiscoveryStatus', async ({ siteId, customHeaders }) =>
            toToolResult(await client.getTopologyDiscoveryStatus(siteId, customHeaders))
        )
    );
}
