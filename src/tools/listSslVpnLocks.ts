import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import type { OmadaClient } from '../omadaClient/index.js';
import { siteInputSchema, toToolResult, wrapToolHandler } from '../server/common.js';

type Client = Pick<OmadaClient, 'listSslVpnLocks'>;

export function registerListSslVpnLocksTool(server: McpServer, client: Client): void {
    server.registerTool(
        'listSslVpnLocks',
        {
            description:
                'List SSL VPN locks: usernames or source IPs locked out of the SSL VPN server, with total and remaining lock time. Returns every page.',
            inputSchema: siteInputSchema.shape,
        },
        wrapToolHandler('listSslVpnLocks', async ({ siteId, customHeaders }) => toToolResult(await client.listSslVpnLocks(siteId, customHeaders)))
    );
}
