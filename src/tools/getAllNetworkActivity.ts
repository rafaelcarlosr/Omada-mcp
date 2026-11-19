import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import type { OmadaClient } from '../omadaClient/index.js';
import { siteInputSchema, toToolResult, wrapToolHandler } from '../server/common.js';

const inputSchema = siteInputSchema.extend({
    start: z.number().int().nonnegative().describe('Start of the period, epoch seconds.'),
    end: z.number().int().nonnegative().describe('End of the period, epoch seconds.'),
});

type Client = Pick<OmadaClient, 'getAllNetworkActivity'>;

export function registerGetAllNetworkActivityTool(server: McpServer, client: Client): void {
    server.registerTool(
        'getAllNetworkActivity',
        {
            description: 'Get total, upload and download traffic of the site over a period, in 5-minute buckets.',
            inputSchema: inputSchema.shape,
        },
        wrapToolHandler('getAllNetworkActivity', async ({ start, end, siteId, customHeaders }) =>
            toToolResult(await client.getAllNetworkActivity({ start, end }, siteId, customHeaders))
        )
    );
}
