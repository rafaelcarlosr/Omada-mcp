import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import type { OmadaClient } from '../omadaClient/index.js';
import { siteInputSchema, toToolResult, wrapToolHandler } from '../server/common.js';

type Client = Pick<OmadaClient, 'listSslVpnBriefResources'>;

export function registerListSslVpnBriefResourcesTool(server: McpServer, client: Client): void {
    server.registerTool(
        'listSslVpnBriefResources',
        {
            description: 'List the SSL VPN resources (IDs and names).',
            inputSchema: siteInputSchema.shape,
        },
        wrapToolHandler('listSslVpnBriefResources', async ({ siteId, customHeaders }) =>
            toToolResult(await client.listSslVpnBriefResources(siteId, customHeaders))
        )
    );
}
