import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import type { OmadaClient } from '../omadaClient/index.js';
import { siteInputSchema, toToolResult, wrapToolHandler } from '../server/common.js';

const inputSchema = siteInputSchema.extend({
    serverId: z.string().trim().min(1).describe('VPN server ID from listVpnServerSummaries.'),
});

type Client = Pick<OmadaClient, 'listVpnServerUserNames'>;

export function registerListVpnServerUserNamesTool(server: McpServer, client: Client): void {
    server.registerTool(
        'listVpnServerUserNames',
        {
            description: 'List the user names assigned to one VPN server.',
            inputSchema: inputSchema.shape,
        },
        wrapToolHandler('listVpnServerUserNames', async ({ serverId, siteId, customHeaders }) =>
            toToolResult(await client.listVpnServerUserNames(serverId, siteId, customHeaders))
        )
    );
}
