import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import type { OmadaClient } from '../omadaClient/index.js';
import { siteInputSchema, toToolResult, wrapToolHandler } from '../server/common.js';

type Client = Pick<OmadaClient, 'listVpnClientSummaries'>;

export function registerListVpnClientSummariesTool(server: McpServer, client: Client): void {
    server.registerTool(
        'listVpnClientSummaries',
        {
            description: 'List the client-to-site VPN clients of a site with their type, WANs and status.',
            inputSchema: siteInputSchema.shape,
        },
        wrapToolHandler('listVpnClientSummaries', async ({ siteId, customHeaders }) =>
            toToolResult(await client.listVpnClientSummaries(siteId, customHeaders))
        )
    );
}
