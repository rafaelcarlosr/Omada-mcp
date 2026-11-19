import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import type { OmadaClient } from '../omadaClient/index.js';
import { siteInputSchema, toToolResult, wrapToolHandler } from '../server/common.js';

type Client = Pick<OmadaClient, 'listVpnIpPools'>;

export function registerListVpnIpPoolsTool(server: McpServer, client: Client): void {
    server.registerTool(
        'listVpnIpPools',
        {
            description: 'List the address pools available to VPN servers.',
            inputSchema: siteInputSchema.shape,
        },
        wrapToolHandler('listVpnIpPools', async ({ siteId, customHeaders }) => toToolResult(await client.listVpnIpPools(siteId, customHeaders)))
    );
}
