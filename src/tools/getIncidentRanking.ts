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

type Client = Pick<OmadaClient, 'getIncidentRanking'>;

export function registerGetIncidentRankingTool(server: McpServer, client: Client): void {
    server.registerTool(
        'getIncidentRanking',
        {
            description: 'Rank incidents of one anomaly code over a period (overview ranking cards).',
            inputSchema: inputSchema.shape,
        },
        wrapToolHandler('getIncidentRanking', async ({ startTime, endTime, anomalyCode, topK, siteId, customHeaders }) =>
            toToolResult(
                await client.getIncidentRanking({ startTime, endTime, anomalyCode, ...(topK === undefined ? {} : { topK }) }, siteId, customHeaders)
            )
        )
    );
}
