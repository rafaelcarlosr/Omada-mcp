import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import type { OmadaClient } from '../omadaClient/index.js';
import { siteInputSchema, toToolResult, wrapToolHandler } from '../server/common.js';

const inputSchema = siteInputSchema.extend({
    familyId: z.string().trim().min(1).describe('Application category (family) ID from listAppCategories.'),
    start: z.number().int().nonnegative().describe('Start of the period, epoch seconds.'),
    end: z.number().int().nonnegative().describe('End of the period, epoch seconds.'),
});

type Client = Pick<OmadaClient, 'getCategoryClientTraffic'>;

export function registerGetCategoryClientTrafficTool(server: McpServer, client: Client): void {
    server.registerTool(
        'getCategoryClientTraffic',
        {
            description: 'Get the clients that used an application category and their traffic over a period.',
            inputSchema: inputSchema.shape,
        },
        wrapToolHandler('getCategoryClientTraffic', async ({ familyId, start, end, siteId, customHeaders }) =>
            toToolResult(await client.getCategoryClientTraffic(familyId, { start, end }, siteId, customHeaders))
        )
    );
}
