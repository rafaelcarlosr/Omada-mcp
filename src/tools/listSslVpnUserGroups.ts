import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import type { OmadaClient } from '../omadaClient/index.js';
import { siteInputSchema, toToolResult, wrapToolHandler } from '../server/common.js';

type Client = Pick<OmadaClient, 'listSslVpnUserGroups'>;

export function registerListSslVpnUserGroupsTool(server: McpServer, client: Client): void {
    server.registerTool(
        'listSslVpnUserGroups',
        {
            description: 'List SSL VPN user groups with their resource groups, member user IDs and RADIUS/LDAP attributes. Returns every page.',
            inputSchema: siteInputSchema.shape,
        },
        wrapToolHandler('listSslVpnUserGroups', async ({ siteId, customHeaders }) =>
            toToolResult(await client.listSslVpnUserGroups(siteId, customHeaders))
        )
    );
}
