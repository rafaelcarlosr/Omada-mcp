import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import type { OmadaClient } from '../omadaClient/index.js';
import { siteInputSchema, toToolResult, wrapToolHandler } from '../server/common.js';

const inputSchema = siteInputSchema.extend({
    applicationId: z.string().trim().min(1).describe('Application ID from getMostActiveApps or the application control lists.'),
    start: z.number().int().nonnegative().describe('Start of the period, epoch seconds.'),
    end: z.number().int().nonnegative().describe('End of the period, epoch seconds.'),
});

type Client = Pick<OmadaClient, 'getAppClientTraffic'>;

export function registerGetAppClientTrafficTool(server: McpServer, client: Client): void {
    server.registerTool(
        'getAppClientTraffic',
        {
            description: 'Get the clients that used an application and their traffic over a period (needs gateway DPI).',
            inputSchema: inputSchema.shape,
        },
        wrapToolHandler('getAppClientTraffic', async ({ applicationId, start, end, siteId, customHeaders }) =>
            toToolResult(await client.getAppClientTraffic(applicationId, { start, end }, siteId, customHeaders))
        )
    );
}
