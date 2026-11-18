import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import type { OmadaClient } from '../omadaClient/index.js';
import { deviceMacSchema, siteInputSchema, toToolResult, wrapToolHandler } from '../server/common.js';

const inputSchema = siteInputSchema.extend({
    switchMac: deviceMacSchema.describe('MAC address of the switch from listDevices.'),
    start: z.number().int().nonnegative().describe('Range start, epoch milliseconds (seconds make the controller fail).'),
    end: z.number().int().nonnegative().describe('Range end, epoch milliseconds.'),
});

type Client = Pick<OmadaClient, 'getSwitchHealthTimeline'>;

export function registerGetSwitchHealthTimelineTool(server: McpServer, client: Client): void {
    server.registerTool(
        'getSwitchHealthTimeline',
        {
            description: 'Get the switch health score timeline for a time range. Times are epoch milliseconds.',
            inputSchema: inputSchema.shape,
        },
        wrapToolHandler('getSwitchHealthTimeline', async ({ switchMac, start, end, siteId, customHeaders }) =>
            toToolResult(await client.getSwitchHealthTimeline(switchMac, { start, end }, siteId, customHeaders))
        )
    );
}
