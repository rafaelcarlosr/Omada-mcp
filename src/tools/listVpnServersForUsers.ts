import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import type { OmadaClient } from '../omadaClient/index.js';
import { siteInputSchema, toToolResult, wrapToolHandler } from '../server/common.js';

type Client = Pick<OmadaClient, 'listVpnServersForUsers'>;

export function registerListVpnServersForUsersTool(server: McpServer, client: Client): void {
    server.registerTool(
        'listVpnServersForUsers',
        {
            description: 'List the VPN servers that VPN users can be assigned to.',
            inputSchema: siteInputSchema.shape,
        },
        wrapToolHandler('listVpnServersForUsers', async ({ siteId, customHeaders }) =>
            toToolResult(await client.listVpnServersForUsers(siteId, customHeaders))
        )
    );
}
