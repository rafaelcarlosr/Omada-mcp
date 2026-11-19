import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import type { OmadaClient } from '../omadaClient/index.js';
import { siteInputSchema, toToolResult, wrapToolHandler } from '../server/common.js';

const inputSchema = siteInputSchema.extend({
    startTime: z.number().int().nonnegative().describe('Start of the period, epoch milliseconds.'),
    endTime: z.number().int().nonnegative().describe('End of the period, epoch milliseconds.'),
    category: z.number().int().min(11).max(19).describe('Incident category number, 11-19 (the category field of listAnomalySettings).'),
});

type Client = Pick<OmadaClient, 'getAnomalyCategoryIncidents'>;

export function registerGetAnomalyCategoryIncidentsTool(server: McpServer, client: Client): void {
    server.registerTool(
        'getAnomalyCategoryIncidents',
        {
            description: 'Get the incident count of each anomaly code in one category over a period.',
            inputSchema: inputSchema.shape,
        },
        wrapToolHandler('getAnomalyCategoryIncidents', async ({ startTime, endTime, category, siteId, customHeaders }) =>
            toToolResult(await client.getAnomalyCategoryIncidents({ startTime, endTime }, category, siteId, customHeaders))
        )
    );
}
