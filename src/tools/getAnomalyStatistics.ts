import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import type { OmadaClient } from '../omadaClient/index.js';
import { siteInputSchema, toToolResult, wrapToolHandler } from '../server/common.js';

const inputSchema = siteInputSchema.extend({
    startTime: z.number().int().nonnegative().describe('Start of the period, epoch milliseconds.'),
    endTime: z.number().int().nonnegative().describe('End of the period, epoch milliseconds.'),
});

type Client = Pick<OmadaClient, 'getAnomalyStatistics'>;

export function registerGetAnomalyStatisticsTool(server: McpServer, client: Client): void {
    server.registerTool(
        'getAnomalyStatistics',
        {
            description: 'Get incident counts over a period by status, category and level.',
            inputSchema: inputSchema.shape,
        },
        wrapToolHandler('getAnomalyStatistics', async ({ startTime, endTime, siteId, customHeaders }) =>
            toToolResult(await client.getAnomalyStatistics({ startTime, endTime }, siteId, customHeaders))
        )
    );
}
