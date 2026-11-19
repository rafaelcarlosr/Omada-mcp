import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import type { OmadaClient } from '../omadaClient/index.js';
import { siteInputSchema, toToolResult, wrapToolHandler } from '../server/common.js';

type Client = Pick<OmadaClient, 'listVpnBriefUserGroups'>;

export function registerListVpnBriefUserGroupsTool(server: McpServer, client: Client): void {
    server.registerTool(
        'listVpnBriefUserGroups',
        {
            description: 'List the VPN user groups (IDs and names).',
            inputSchema: siteInputSchema.shape,
        },
        wrapToolHandler('listVpnBriefUserGroups', async ({ siteId, customHeaders }) =>
            toToolResult(await client.listVpnBriefUserGroups(siteId, customHeaders))
        )
    );
}
