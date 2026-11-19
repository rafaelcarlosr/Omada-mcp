import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import type { OmadaClient } from '../omadaClient/index.js';
import { siteInputSchema, toToolResult, wrapToolHandler } from '../server/common.js';

const inputSchema = siteInputSchema.extend({
    startTime: z.number().int().nonnegative().describe('Start of the period, epoch milliseconds.'),
    endTime: z.number().int().nonnegative().describe('End of the period, epoch milliseconds.'),
});

type Client = Pick<OmadaClient, 'getAnomalyIncidentDistribution'>;

export function registerGetAnomalyIncidentDistributionTool(server: McpServer, client: Client): void {
    server.registerTool(
        'getAnomalyIncidentDistribution',
        {
            description: 'Get the number of incidents per hour over a period.',
            inputSchema: inputSchema.shape,
        },
        wrapToolHandler('getAnomalyIncidentDistribution', async ({ startTime, endTime, siteId, customHeaders }) =>
            toToolResult(await client.getAnomalyIncidentDistribution({ startTime, endTime }, siteId, customHeaders))
        )
    );
}
