import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import type { OmadaClient } from '../omadaClient/index.js';
import { siteInputSchema, toToolResult, wrapToolHandler } from '../server/common.js';

type Client = Pick<OmadaClient, 'listSslVpnBriefUserGroups'>;

export function registerListSslVpnBriefUserGroupsTool(server: McpServer, client: Client): void {
    server.registerTool(
        'listSslVpnBriefUserGroups',
        {
            description: 'List the SSL VPN user groups (IDs and names).',
            inputSchema: siteInputSchema.shape,
        },
        wrapToolHandler('listSslVpnBriefUserGroups', async ({ siteId, customHeaders }) =>
            toToolResult(await client.listSslVpnBriefUserGroups(siteId, customHeaders))
        )
    );
}
