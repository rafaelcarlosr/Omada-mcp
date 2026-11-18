import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import type { OmadaClient } from '../omadaClient/index.js';
import { siteInputSchema, toToolResult, wrapToolHandler } from '../server/common.js';

type Client = Pick<OmadaClient, 'listSslVpnResources'>;

export function registerListSslVpnResourcesTool(server: McpServer, client: Client): void {
    server.registerTool(
        'listSslVpnResources',
        {
            description:
                'List SSL VPN resources (IP subnets or domains with protocol and ports) and the resource groups that use them. Returns every page.',
            inputSchema: siteInputSchema.shape,
        },
        wrapToolHandler('listSslVpnResources', async ({ siteId, customHeaders }) =>
            toToolResult(await client.listSslVpnResources(siteId, customHeaders))
        )
    );
}
