import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import type { OmadaClient } from '../omadaClient/index.js';
import { siteInputSchema, toToolResult, wrapToolHandler } from '../server/common.js';

const inputSchema = siteInputSchema.extend({
    deviceNum: z.number().int().min(1).max(100).default(5).describe('How many APs to return, 1-100.'),
    start: z.number().int().nonnegative().describe('Start of the period, epoch seconds.'),
    end: z.number().int().nonnegative().describe('End of the period, epoch seconds.'),
});

type Client = Pick<OmadaClient, 'listMostActiveEapsByTraffic'>;

export function registerListMostActiveEapsByTrafficTool(server: McpServer, client: Client): void {
    server.registerTool(
        'listMostActiveEapsByTraffic',
        {
            description: 'List the APs with the most traffic over a period, with the total traffic (v2 route).',
            inputSchema: inputSchema.shape,
        },
        wrapToolHandler('listMostActiveEapsByTraffic', async ({ deviceNum, start, end, siteId, customHeaders }) =>
            toToolResult(await client.listMostActiveEapsByTraffic(deviceNum ?? 5, { start, end }, siteId, customHeaders))
        )
    );
}
