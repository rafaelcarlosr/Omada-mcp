import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import type { OmadaClient } from '../omadaClient/index.js';
import { siteInputSchema, toToolResult, wrapToolHandler } from '../server/common.js';

type Client = Pick<OmadaClient, 'listSslVpnLockedTunnels'>;

export function registerListSslVpnLockedTunnelsTool(server: McpServer, client: Client): void {
    server.registerTool(
        'listSslVpnLockedTunnels',
        {
            description: 'List the locked SSL VPN tunnels (by user name or IP) and the time left on each lock.',
            inputSchema: siteInputSchema.shape,
        },
        wrapToolHandler('listSslVpnLockedTunnels', async ({ siteId, customHeaders }) =>
            toToolResult(await client.listSslVpnLockedTunnels(siteId, customHeaders))
        )
    );
}
