import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import type { OmadaClient } from '../omadaClient/index.js';
import { siteInputSchema, toToolResult, wrapToolHandler } from '../server/common.js';

const inputSchema = siteInputSchema.extend({
    start: z.number().int().nonnegative().describe('Start of the period, epoch seconds.'),
    end: z.number().int().nonnegative().describe('End of the period, epoch seconds.'),
});

type Client = Pick<OmadaClient, 'getTopAps'>;

export function registerGetTopApsTool(server: McpServer, client: Client): void {
    server.registerTool(
        'getTopAps',
        {
            description: 'Get the top APs of the site over a period by retry rate, dropped rate and other quality measures.',
            inputSchema: inputSchema.shape,
        },
        wrapToolHandler('getTopAps', async ({ start, end, siteId, customHeaders }) =>
            toToolResult(await client.getTopAps({ start, end }, siteId, customHeaders))
        )
    );
}
