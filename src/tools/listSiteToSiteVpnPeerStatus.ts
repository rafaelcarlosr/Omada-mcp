import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import type { OmadaClient } from '../omadaClient/index.js';
import { siteInputSchema, toToolResult, wrapToolHandler } from '../server/common.js';

const inputSchema = siteInputSchema.extend({
    vpnId: z.string().trim().min(1).describe('Site-to-site VPN ID from listSiteToSiteVpns or listSiteToSiteVpnStatus.'),
});

type Client = Pick<OmadaClient, 'listSiteToSiteVpnPeerStatus'>;

export function registerListSiteToSiteVpnPeerStatusTool(server: McpServer, client: Client): void {
    server.registerTool(
        'listSiteToSiteVpnPeerStatus',
        {
            description: 'List the peer status of one site-to-site VPN. Returns every page.',
            inputSchema: inputSchema.shape,
        },
        wrapToolHandler('listSiteToSiteVpnPeerStatus', async ({ vpnId, siteId, customHeaders }) =>
            toToolResult(await client.listSiteToSiteVpnPeerStatus(vpnId, siteId, customHeaders))
        )
    );
}
