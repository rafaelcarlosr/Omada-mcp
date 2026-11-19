import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import type { OmadaClient } from '../omadaClient/index.js';
import { siteInputSchema, toToolResult, wrapToolHandler } from '../server/common.js';

const inputSchema = siteInputSchema.extend({
    vpnId: z.string().trim().min(1).describe('VPN ID from listSiteToSiteVpnSummaries, listVpnServerSummaries or listVpnClientSummaries.'),
});

type Client = Pick<OmadaClient, 'listVpnServerUsers'>;

export function registerListVpnServerUsersTool(server: McpServer, client: Client): void {
    server.registerTool(
        'listVpnServerUsers',
        {
            description: 'List the users of one VPN server with their client mode and connection limits.',
            inputSchema: inputSchema.shape,
        },
        wrapToolHandler('listVpnServerUsers', async ({ vpnId, siteId, customHeaders }) =>
            toToolResult(await client.listVpnServerUsers(vpnId, siteId, customHeaders))
        )
    );
}
