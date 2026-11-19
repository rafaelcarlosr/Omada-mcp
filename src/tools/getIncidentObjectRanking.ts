import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import type { OmadaClient } from '../omadaClient/index.js';
import { siteInputSchema, toToolResult, wrapToolHandler } from '../server/common.js';

const inputSchema = siteInputSchema.extend({
    startTime: z.number().int().nonnegative().describe('Start of the period, epoch milliseconds.'),
    endTime: z.number().int().nonnegative().describe('End of the period, epoch milliseconds.'),
    anomalyCode: z.number().int().describe('Anomaly event code (numeric).'),
    topK: z.number().int().min(1).max(20).optional().describe('How many entries, up to 20 (default 5).'),
});

type Client = Pick<OmadaClient, 'getIncidentObjectRanking'>;

export function registerGetIncidentObjectRankingTool(server: McpServer, client: Client): void {
    server.registerTool(
        'getIncidentObjectRanking',
        {
            description: 'Rank the devices and clients most affected by one anomaly code over a period.',
            inputSchema: inputSchema.shape,
        },
        wrapToolHandler('getIncidentObjectRanking', async ({ startTime, endTime, anomalyCode, topK, siteId, customHeaders }) =>
            toToolResult(
                await client.getIncidentObjectRanking(
                    { startTime, endTime, anomalyCode, ...(topK === undefined ? {} : { topK }) },
                    siteId,
                    customHeaders
                )
            )
        )
    );
}
