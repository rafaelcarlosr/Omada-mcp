import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import type { OmadaClient } from '../omadaClient/index.js';
import { siteInputSchema, toToolResult, wrapToolHandler } from '../server/common.js';

const inputSchema = siteInputSchema.extend({
    vpnType: z.number().int().min(0).max(5).describe('VPN type: 0 L2TP, 1 PPTP, 2 IPsec, 3 OpenVPN, 4 WireGuard, 5 SSL VPN.'),
    clientMode: z.number().int().min(0).max(1).optional().describe('Optional VPN user client mode filter: 0 network extension mode, 1 client.'),
});

type Client = Pick<OmadaClient, 'listVpnServerStatus'>;

export function registerListVpnServerStatusTool(server: McpServer, client: Client): void {
    server.registerTool(
        'listVpnServerStatus',
        {
            description:
                'List client-to-site VPN server status for one VPN type (0 L2TP, 1 PPTP, 2 IPsec, 3 OpenVPN, 4 WireGuard, 5 SSL VPN): tunnels, active clients and traffic. Returns every page.',
            inputSchema: inputSchema.shape,
        },
        wrapToolHandler('listVpnServerStatus', async ({ vpnType, clientMode, siteId, customHeaders }) =>
            toToolResult(await client.listVpnServerStatus(vpnType, clientMode, siteId, customHeaders))
        )
    );
}
