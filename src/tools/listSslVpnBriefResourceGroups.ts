import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import type { OmadaClient } from '../omadaClient/index.js';
import { siteInputSchema, toToolResult, wrapToolHandler } from '../server/common.js';

type Client = Pick<OmadaClient, 'listSslVpnBriefResourceGroups'>;

export function registerListSslVpnBriefResourceGroupsTool(server: McpServer, client: Client): void {
    server.registerTool(
        'listSslVpnBriefResourceGroups',
        {
            description: 'List the SSL VPN resource groups (IDs and names).',
            inputSchema: siteInputSchema.shape,
        },
        wrapToolHandler('listSslVpnBriefResourceGroups', async ({ siteId, customHeaders }) =>
            toToolResult(await client.listSslVpnBriefResourceGroups(siteId, customHeaders))
        )
    );
}
