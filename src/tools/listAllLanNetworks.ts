import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import type { OmadaClient } from '../omadaClient/index.js';
import { siteInputSchema, toToolResult, wrapToolHandler } from '../server/common.js';

type Client = Pick<OmadaClient, 'listAllLanNetworks'>;

export function registerListAllLanNetworksTool(server: McpServer, client: Client): void {
    server.registerTool(
        'listAllLanNetworks',
        {
            description: 'List every network of a site (all purposes) without paging.',
            inputSchema: siteInputSchema.shape,
        },
        wrapToolHandler('listAllLanNetworks', async ({ siteId, customHeaders }) =>
            toToolResult(await client.listAllLanNetworks(siteId, customHeaders))
        )
    );
}
