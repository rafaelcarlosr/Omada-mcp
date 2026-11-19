import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import type { OmadaClient } from '../omadaClient/index.js';
import { siteInputSchema, toToolResult, wrapToolHandler } from '../server/common.js';

const inputSchema = siteInputSchema.extend({
    vpnId: z.string().trim().min(1).describe('VPN ID from listSiteToSiteVpnSummaries, listVpnServerSummaries or listVpnClientSummaries.'),
});

type Client = Pick<OmadaClient, 'checkVpnUsage'>;

export function registerCheckVpnUsageTool(server: McpServer, client: Client): void {
    server.registerTool(
        'checkVpnUsage',
        {
            description: 'Check which features (routes, failover, users) use a VPN before changing or deleting it.',
            inputSchema: inputSchema.shape,
        },
        wrapToolHandler('checkVpnUsage', async ({ vpnId, siteId, customHeaders }) =>
            toToolResult(await client.checkVpnUsage(vpnId, siteId, customHeaders))
        )
    );
}
