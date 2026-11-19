import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import type { OmadaClient } from '../omadaClient/index.js';
import { siteInputSchema, toToolResult, wrapToolHandler } from '../server/common.js';

const inputSchema = siteInputSchema.extend({
    vpnId: z.string().trim().min(1).describe('VPN ID from listSiteToSiteVpnSummaries, listVpnServerSummaries or listVpnClientSummaries.'),
});

type Client = Pick<OmadaClient, 'getClientToSiteVpnServer'>;

export function registerGetClientToSiteVpnServerTool(server: McpServer, client: Client): void {
    server.registerTool(
        'getClientToSiteVpnServer',
        {
            description: 'Get one client-to-site VPN server: type, WANs, address pool, authentication and lock settings. Keys are redacted.',
            inputSchema: inputSchema.shape,
        },
        wrapToolHandler('getClientToSiteVpnServer', async ({ vpnId, siteId, customHeaders }) =>
            toToolResult(await client.getClientToSiteVpnServer(vpnId, siteId, customHeaders))
        )
    );
}
