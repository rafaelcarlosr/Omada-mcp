import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import type { OmadaClient } from '../omadaClient/index.js';
import { siteInputSchema, toToolResult, wrapToolHandler } from '../server/common.js';

const inputSchema = siteInputSchema.extend({
    start: z.number().int().nonnegative().describe('Start of the period, epoch seconds.'),
    end: z.number().int().nonnegative().describe('End of the period, epoch seconds.'),
});

type Client = Pick<OmadaClient, 'getMostActiveApps'>;

export function registerGetMostActiveAppsTool(server: McpServer, client: Client): void {
    server.registerTool(
        'getMostActiveApps',
        {
            description: 'Get the applications with the most traffic over a period (needs gateway DPI).',
            inputSchema: inputSchema.shape,
        },
        wrapToolHandler('getMostActiveApps', async ({ start, end, siteId, customHeaders }) =>
            toToolResult(await client.getMostActiveApps({ start, end }, siteId, customHeaders))
        )
    );
}
