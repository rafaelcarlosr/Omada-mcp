import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import type { OmadaClient } from '../omadaClient/index.js';
import { siteInputSchema, toToolResult, wrapToolHandler } from '../server/common.js';

const inputSchema = siteInputSchema.extend({
    clientMac: z
        .string()
        .regex(/^[0-9a-f]{2}([:-][0-9a-f]{2}){5}$/i)
        .describe('Client MAC address from listClients.'),
    start: z.number().int().nonnegative().describe('Range start, epoch milliseconds.'),
    end: z.number().int().nonnegative().describe('Range end, epoch milliseconds.'),
    type: z
        .union([z.literal(0), z.literal(1), z.literal(2), z.literal(3)])
        .default(0)
        .describe('0 connection, 1 association, 2 roaming, 3 disconnection.'),
});

type Client = Pick<OmadaClient, 'getClientTimeline'>;

export function registerGetClientTimelineTool(server: McpServer, client: Client): void {
    server.registerTool(
        'getClientTimeline',
        {
            description:
                'Get timeline events of one client for a time range in epoch milliseconds; type 0 connection, 1 association, 2 roaming, 3 disconnection.',
            inputSchema: inputSchema.shape,
        },
        wrapToolHandler('getClientTimeline', async ({ clientMac, start, end, type, siteId, customHeaders }) =>
            toToolResult(await client.getClientTimeline(clientMac, { start, end }, type, siteId, customHeaders))
        )
    );
}
