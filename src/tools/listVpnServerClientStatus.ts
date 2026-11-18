import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import type { OmadaClient } from '../omadaClient/index.js';
import { siteInputSchema, toToolResult, wrapToolHandler } from '../server/common.js';

const inputSchema = siteInputSchema.extend({
    vpnId: z.string().trim().min(1).describe('VPN server ID from listClientToSiteVpnServers or listVpnServerStatus.'),
});

type Client = Pick<OmadaClient, 'listVpnServerClientStatus'>;

export function registerListVpnServerClientStatusTool(server: McpServer, client: Client): void {
    server.registerTool(
        'listVpnServerClientStatus',
        {
            description: 'List the clients connected to one client-to-site VPN server, with their tunnel addresses and traffic. Returns every page.',
            inputSchema: inputSchema.shape,
        },
        wrapToolHandler('listVpnServerClientStatus', async ({ vpnId, siteId, customHeaders }) =>
            toToolResult(await client.listVpnServerClientStatus(vpnId, siteId, customHeaders))
        )
    );
}
