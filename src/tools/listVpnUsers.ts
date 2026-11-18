import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import type { OmadaClient } from '../omadaClient/index.js';
import { siteInputSchema, toToolResult, wrapToolHandler } from '../server/common.js';
import { redactPasswords } from './hotspotAccountShared.js';

type Client = Pick<OmadaClient, 'listVpnUsers'>;

export function registerListVpnUsersTool(server: McpServer, client: Client): void {
    server.registerTool(
        'listVpnUsers',
        {
            description:
                'List every VPN user account (L2TP/PPTP, OpenVPN and SSL VPN) with protocol, servers, limits and SSL VPN group. Passwords are redacted. Returns every page.',
            inputSchema: siteInputSchema.shape,
        },
        wrapToolHandler('listVpnUsers', async ({ siteId, customHeaders }) =>
            toToolResult(redactPasswords(await client.listVpnUsers(siteId, customHeaders)))
        )
    );
}
