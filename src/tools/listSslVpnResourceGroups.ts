import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import type { OmadaClient } from '../omadaClient/index.js';
import { siteInputSchema, toToolResult, wrapToolHandler } from '../server/common.js';

type Client = Pick<OmadaClient, 'listSslVpnResourceGroups'>;

export function registerListSslVpnResourceGroupsTool(server: McpServer, client: Client): void {
    server.registerTool(
        'listSslVpnResourceGroups',
        {
            description: 'List SSL VPN resource groups, including the built-in Group_ALL and Group_LAN, with their resources. Returns every page.',
            inputSchema: siteInputSchema.shape,
        },
        wrapToolHandler('listSslVpnResourceGroups', async ({ siteId, customHeaders }) =>
            toToolResult(await client.listSslVpnResourceGroups(siteId, customHeaders))
        )
    );
}
