import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import type { OmadaClient } from '../omadaClient/index.js';
import { siteInputSchema, toToolResult, wrapToolHandler } from '../server/common.js';

type Client = Pick<OmadaClient, 'listVpnServerSummaries'>;

export function registerListVpnServerSummariesTool(server: McpServer, client: Client): void {
    server.registerTool(
        'listVpnServerSummaries',
        {
            description: 'List the client-to-site VPN servers of a site with their type, WANs and status.',
            inputSchema: siteInputSchema.shape,
        },
        wrapToolHandler('listVpnServerSummaries', async ({ siteId, customHeaders }) =>
            toToolResult(await client.listVpnServerSummaries(siteId, customHeaders))
        )
    );
}
