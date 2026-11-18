import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import type { OmadaClient } from '../omadaClient/index.js';
import { siteInputSchema, toToolResult, wrapToolHandler } from '../server/common.js';

const inputSchema = siteInputSchema.extend({
    clientMac: z
        .string()
        .regex(/^[0-9a-f]{2}([:-][0-9a-f]{2}){5}$/i)
        .describe('Client MAC address from listClients.'),
    granularity: z.enum(['5Min', 'hourly', 'daily']).describe('Statistics interval.'),
    startSec: z.number().int().nonnegative().describe('Range start, epoch seconds.'),
    endSec: z.number().int().nonnegative().describe('Range end, epoch seconds.'),
});

type Client = Pick<OmadaClient, 'getClientStats'>;

export function registerGetClientStatsTool(server: McpServer, client: Client): void {
    server.registerTool(
        'getClientStats',
        {
            description: 'Get traffic and signal statistics of one client at 5-minute, hourly or daily granularity. Times are epoch seconds.',
            inputSchema: inputSchema.shape,
        },
        wrapToolHandler('getClientStats', async ({ clientMac, granularity, startSec, endSec, siteId, customHeaders }) =>
            toToolResult(await client.getClientStats(clientMac, granularity, { startSec, endSec }, siteId, customHeaders))
        )
    );
}
