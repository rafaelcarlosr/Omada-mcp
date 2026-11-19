import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import type { OmadaClient } from '../omadaClient/index.js';
import { deviceMacSchema, siteInputSchema, toToolResult, wrapToolHandler } from '../server/common.js';

const inputSchema = siteInputSchema.extend({
    apMac: deviceMacSchema.describe('MAC of the access point.'),
    startTime: z.number().int().nonnegative().describe('Start of the period, epoch milliseconds.'),
    endTime: z.number().int().nonnegative().describe('End of the period, epoch milliseconds.'),
});

type Client = Pick<OmadaClient, 'getApHealthTimeline'>;

export function registerGetApHealthTimelineTool(server: McpServer, client: Client): void {
    server.registerTool(
        'getApHealthTimeline',
        {
            description: 'Get the health score of an AP over a period (10-minute buckets).',
            inputSchema: inputSchema.shape,
        },
        wrapToolHandler('getApHealthTimeline', async ({ apMac, startTime, endTime, siteId, customHeaders }) =>
            toToolResult(await client.getApHealthTimeline(apMac, { startTime, endTime }, siteId, customHeaders))
        )
    );
}
