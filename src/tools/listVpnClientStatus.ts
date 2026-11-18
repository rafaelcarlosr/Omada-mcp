import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import type { OmadaClient } from '../omadaClient/index.js';
import { siteInputSchema, toToolResult, wrapToolHandler } from '../server/common.js';

const inputSchema = siteInputSchema.extend({
    vpnType: z.union([z.literal(0), z.literal(1), z.literal(3), z.literal(4)]).describe('VPN type: 0 L2TP, 1 PPTP, 3 OpenVPN, 4 WireGuard.'),
});

type Client = Pick<OmadaClient, 'listVpnClientStatus'>;

export function registerListVpnClientStatusTool(server: McpServer, client: Client): void {
    server.registerTool(
        'listVpnClientStatus',
        {
            description:
                'List client-to-site VPN client tunnel status for one VPN type (0 L2TP, 1 PPTP, 3 OpenVPN, 4 WireGuard). Returns every page.',
            inputSchema: inputSchema.shape,
        },
        wrapToolHandler('listVpnClientStatus', async ({ vpnType, siteId, customHeaders }) =>
            toToolResult(await client.listVpnClientStatus(vpnType, siteId, customHeaders))
        )
    );
}
