import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import type { OmadaClient } from '../omadaClient/index.js';
import { siteInputSchema, toToolResult, wrapToolHandler } from '../server/common.js';

const inputSchema = siteInputSchema.extend({
    vpnId: z.string().trim().min(1).describe('VPN ID from listSiteToSiteVpnSummaries, listVpnServerSummaries or listVpnClientSummaries.'),
});

type Client = Pick<OmadaClient, 'getSiteToSiteVpn'>;

export function registerGetSiteToSiteVpnTool(server: McpServer, client: Client): void {
    server.registerTool(
        'getSiteToSiteVpn',
        {
            description: 'Get one site-to-site VPN (IPsec, OpenVPN or WireGuard): peers, networks and advanced settings. Keys are redacted.',
            inputSchema: inputSchema.shape,
        },
        wrapToolHandler('getSiteToSiteVpn', async ({ vpnId, siteId, customHeaders }) =>
            toToolResult(await client.getSiteToSiteVpn(vpnId, siteId, customHeaders))
        )
    );
}
