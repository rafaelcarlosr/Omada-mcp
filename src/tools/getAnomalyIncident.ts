import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import type { OmadaClient } from '../omadaClient/index.js';
import { siteInputSchema, toToolResult, wrapToolHandler } from '../server/common.js';

const inputSchema = siteInputSchema.extend({
    incidentId: z.string().trim().min(1).describe('Incident ID from listAnomalyIncidents.'),
});

type Client = Pick<OmadaClient, 'getAnomalyIncident'>;

export function registerGetAnomalyIncidentTool(server: McpServer, client: Client): void {
    server.registerTool(
        'getAnomalyIncident',
        {
            description: 'Get one incident with its affected object, timeline and suggestions.',
            inputSchema: inputSchema.shape,
        },
        wrapToolHandler('getAnomalyIncident', async ({ incidentId, siteId, customHeaders }) =>
            toToolResult(await client.getAnomalyIncident(incidentId, siteId, customHeaders))
        )
    );
}
