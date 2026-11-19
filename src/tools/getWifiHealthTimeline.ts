import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import type { OmadaClient } from '../omadaClient/index.js';
import { siteInputSchema, toToolResult, wrapToolHandler } from '../server/common.js';

const inputSchema = siteInputSchema.extend({
    startTime: z.number().int().nonnegative().describe('Start of the period, epoch milliseconds.'),
    endTime: z.number().int().nonnegative().describe('End of the period, epoch milliseconds.'),
});

type Client = Pick<OmadaClient, 'getWifiHealthTimeline'>;

export function registerGetWifiHealthTimelineTool(server: McpServer, client: Client): void {
    server.registerTool(
        'getWifiHealthTimeline',
        {
            description: 'Get the Wi-Fi health score of the site over a period (10-minute buckets).',
            inputSchema: inputSchema.shape,
        },
        wrapToolHandler('getWifiHealthTimeline', async ({ startTime, endTime, siteId, customHeaders }) =>
            toToolResult(await client.getWifiHealthTimeline({ startTime, endTime }, siteId, customHeaders))
        )
    );
}
