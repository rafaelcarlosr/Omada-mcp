import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import type { OmadaClient } from '../omadaClient/index.js';
import { siteInputSchema, toToolResult, wrapToolHandler } from '../server/common.js';

const inputSchema = siteInputSchema.extend({
    startTime: z.number().int().nonnegative().describe('Start of the period, epoch milliseconds.'),
    endTime: z.number().int().nonnegative().describe('End of the period, epoch milliseconds.'),
});

type Client = Pick<OmadaClient, 'getWifiSubHealthTimeline'>;

export function registerGetWifiSubHealthTimelineTool(server: McpServer, client: Client): void {
    server.registerTool(
        'getWifiSubHealthTimeline',
        {
            description: 'Get the Wi-Fi health sub-scores of the site over a period.',
            inputSchema: inputSchema.shape,
        },
        wrapToolHandler('getWifiSubHealthTimeline', async ({ startTime, endTime, siteId, customHeaders }) =>
            toToolResult(await client.getWifiSubHealthTimeline({ startTime, endTime }, siteId, customHeaders))
        )
    );
}
