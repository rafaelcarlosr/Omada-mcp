import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import type { OmadaClient } from '../omadaClient/index.js';
import { siteInputSchema, toToolResult, wrapToolHandler } from '../server/common.js';
import { createPaginationSchema } from '../utils/pagination-schema.js';

const inputSchema = siteInputSchema.extend({
    startTime: z.number().int().nonnegative().describe('Start of the period, epoch milliseconds.'),
    endTime: z.number().int().nonnegative().describe('End of the period, epoch milliseconds.'),
    status: z.number().int().min(0).max(3).optional().describe('0 unresolved, 1 resolved, 2 ignored, 3 ongoing.'),
    category: z.string().min(1).optional().describe('Incident category, e.g. wirelessNetwork, deviceStatus.'),
    anomalyCode: z.string().min(1).optional().describe('Anomaly event code.'),
    ...createPaginationSchema(),
});

type Client = Pick<OmadaClient, 'listAnomalyIncidents'>;

export function registerListAnomalyIncidentsTool(server: McpServer, client: Client): void {
    server.registerTool(
        'listAnomalyIncidents',
        {
            description: 'List incidents (detected anomalies) of the site over a period, with counts by status and level (paginated).',
            inputSchema: inputSchema.shape,
        },
        wrapToolHandler(
            'listAnomalyIncidents',
            async ({ startTime, endTime, status, category, anomalyCode, page, pageSize, siteId, customHeaders }) =>
                toToolResult(
                    await client.listAnomalyIncidents(
                        { startTime, endTime },
                        page ?? 1,
                        pageSize ?? 10,
                        { status, category, anomalyCode },
                        siteId,
                        customHeaders
                    )
                )
        )
    );
}
