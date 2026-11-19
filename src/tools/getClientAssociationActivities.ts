import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import type { OmadaClient } from '../omadaClient/index.js';
import { siteInputSchema, toToolResult, wrapToolHandler } from '../server/common.js';

const inputSchema = siteInputSchema.extend({
    start: z.number().int().nonnegative().describe('Start of the period, epoch seconds.'),
    end: z.number().int().nonnegative().describe('End of the period, epoch seconds.'),
});

type Client = Pick<OmadaClient, 'getClientAssociationActivities'>;

export function registerGetClientAssociationActivitiesTool(server: McpServer, client: Client): void {
    server.registerTool(
        'getClientAssociationActivities',
        {
            description: 'Get how long wireless clients took to associate over a period, in time buckets.',
            inputSchema: inputSchema.shape,
        },
        wrapToolHandler('getClientAssociationActivities', async ({ start, end, siteId, customHeaders }) =>
            toToolResult(await client.getClientAssociationActivities({ start, end }, siteId, customHeaders))
        )
    );
}
