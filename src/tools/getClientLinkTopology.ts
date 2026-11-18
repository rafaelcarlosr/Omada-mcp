import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import type { OmadaClient } from '../omadaClient/index.js';
import { siteInputSchema, toToolResult, wrapToolHandler } from '../server/common.js';

const inputSchema = siteInputSchema.extend({
    clientMac: z
        .string()
        .regex(/^[0-9a-f]{2}([:-][0-9a-f]{2}){5}$/i)
        .describe('Client MAC address from listClients.'),
});

type Client = Pick<OmadaClient, 'getClientLinkTopology'>;

export function registerGetClientLinkTopologyTool(server: McpServer, client: Client): void {
    server.registerTool(
        'getClientLinkTopology',
        {
            description: 'Get the path from one client through APs and switches to the gateway, with link rates and health.',
            inputSchema: inputSchema.shape,
        },
        wrapToolHandler('getClientLinkTopology', async ({ clientMac, siteId, customHeaders }) =>
            toToolResult(await client.getClientLinkTopology(clientMac, siteId, customHeaders))
        )
    );
}
