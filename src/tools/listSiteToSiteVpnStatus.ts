import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import type { OmadaClient } from '../omadaClient/index.js';
import { siteInputSchema, toToolResult, wrapToolHandler } from '../server/common.js';

const inputSchema = siteInputSchema.extend({
    vpnType: z.union([z.literal(2), z.literal(4)]).describe('VPN type: 2 IPsec, 4 WireGuard.'),
});

type Client = Pick<OmadaClient, 'listSiteToSiteVpnStatus'>;

export function registerListSiteToSiteVpnStatusTool(server: McpServer, client: Client): void {
    server.registerTool(
        'listSiteToSiteVpnStatus',
        {
            description: 'List site-to-site VPN status for IPsec (vpnType 2) or WireGuard (vpnType 4) tunnels. Returns every page.',
            inputSchema: inputSchema.shape,
        },
        wrapToolHandler('listSiteToSiteVpnStatus', async ({ vpnType, siteId, customHeaders }) =>
            toToolResult(await client.listSiteToSiteVpnStatus(vpnType, siteId, customHeaders))
        )
    );
}
