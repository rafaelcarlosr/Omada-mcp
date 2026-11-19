import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import type { OmadaClient } from '../omadaClient/index.js';
import { siteInputSchema, toToolResult, wrapToolHandler } from '../server/common.js';

const inputSchema = siteInputSchema.extend({
    vpnId: z.string().trim().min(1).describe('VPN ID from listSiteToSiteVpnSummaries, listVpnServerSummaries or listVpnClientSummaries.'),
});

type Client = Pick<OmadaClient, 'getClientToSiteVpnClient'>;

export function registerGetClientToSiteVpnClientTool(server: McpServer, client: Client): void {
    server.registerTool(
        'getClientToSiteVpnClient',
        {
            description: 'Get one client-to-site VPN client: server, networks and credentials. Keys and passwords are redacted.',
            inputSchema: inputSchema.shape,
        },
        wrapToolHandler('getClientToSiteVpnClient', async ({ vpnId, siteId, customHeaders }) =>
            toToolResult(await client.getClientToSiteVpnClient(vpnId, siteId, customHeaders))
        )
    );
}
