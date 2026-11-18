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
});

type Client = Pick<OmadaClient, 'getClientHealthDetail'>;

export function registerGetClientHealthDetailTool(server: McpServer, client: Client): void {
    server.registerTool(
        'getClientHealthDetail',
        {
            description: 'Get the health of one client (association, signal, throughput scores) for a time range in epoch milliseconds.',
            inputSchema: inputSchema.shape,
        },
        wrapToolHandler('getClientHealthDetail', async ({ clientMac, start, end, siteId, customHeaders }) =>
            toToolResult(await client.getClientHealthDetail(clientMac, { start, end }, siteId, customHeaders))
        )
    );
}
