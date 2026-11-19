import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import type { OmadaClient } from '../omadaClient/index.js';
import { deviceMacSchema, siteInputSchema, toToolResult, wrapToolHandler } from '../server/common.js';

const inputSchema = siteInputSchema.extend({
    apMac: deviceMacSchema.describe('MAC of the access point.'),
    startTime: z.number().int().nonnegative().describe('Start of the period, epoch milliseconds.'),
    endTime: z.number().int().nonnegative().describe('End of the period, epoch milliseconds.'),
});

type Client = Pick<OmadaClient, 'getApHealthDetail'>;

export function registerGetApHealthDetailTool(server: McpServer, client: Client): void {
    server.registerTool(
        'getApHealthDetail',
        {
            description: 'Get the health score of an AP over a period with CPU, memory, interference and client factors.',
            inputSchema: inputSchema.shape,
        },
        wrapToolHandler('getApHealthDetail', async ({ apMac, startTime, endTime, siteId, customHeaders }) =>
            toToolResult(await client.getApHealthDetail(apMac, { startTime, endTime }, siteId, customHeaders))
        )
    );
}
