import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import type { OmadaClient } from '../omadaClient/index.js';
import { siteInputSchema, toToolResult, wrapToolHandler } from '../server/common.js';

const inputSchema = siteInputSchema.extend({
    protocol: z.number().int().min(0).max(2).describe('0 L2TP or PPTP, 1 OpenVPN, 2 SSL VPN.'),
});

type Client = Pick<OmadaClient, 'listVpnUsersByProtocol'>;

export function registerListVpnUsersByProtocolTool(server: McpServer, client: Client): void {
    server.registerTool(
        'listVpnUsersByProtocol',
        {
            description: 'List the VPN users of one protocol without paging.',
            inputSchema: inputSchema.shape,
        },
        wrapToolHandler('listVpnUsersByProtocol', async ({ protocol, siteId, customHeaders }) =>
            toToolResult(await client.listVpnUsersByProtocol(protocol, siteId, customHeaders))
        )
    );
}
