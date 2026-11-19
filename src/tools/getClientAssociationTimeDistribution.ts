import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import type { OmadaClient } from '../omadaClient/index.js';
import { siteInputSchema, toToolResult, wrapToolHandler } from '../server/common.js';

const inputSchema = siteInputSchema.extend({
    start: z.number().int().nonnegative().describe('Start of the period, epoch seconds.'),
    end: z.number().int().nonnegative().describe('End of the period, epoch seconds.'),
});

type Client = Pick<OmadaClient, 'getClientAssociationTimeDistribution'>;

export function registerGetClientAssociationTimeDistributionTool(server: McpServer, client: Client): void {
    server.registerTool(
        'getClientAssociationTimeDistribution',
        {
            description: 'Get the distribution of wireless client association times and failures over a period.',
            inputSchema: inputSchema.shape,
        },
        wrapToolHandler('getClientAssociationTimeDistribution', async ({ start, end, siteId, customHeaders }) =>
            toToolResult(await client.getClientAssociationTimeDistribution({ start, end }, siteId, customHeaders))
        )
    );
}
