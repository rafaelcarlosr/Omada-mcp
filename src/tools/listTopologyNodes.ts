import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import type { OmadaClient } from '../omadaClient/index.js';
import { siteInputSchema, toToolResult, wrapToolHandler } from '../server/common.js';

type Client = Pick<OmadaClient, 'listTopologyNodes'>;

export function registerListTopologyNodesTool(server: McpServer, client: Client): void {
    server.registerTool(
        'listTopologyNodes',
        {
            description: 'List the devices that can be the topology root node, marking the current root.',
            inputSchema: siteInputSchema.shape,
        },
        wrapToolHandler('listTopologyNodes', async ({ siteId, customHeaders }) => toToolResult(await client.listTopologyNodes(siteId, customHeaders)))
    );
}
