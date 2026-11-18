import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import type { OmadaClient } from '../omadaClient/index.js';
import { deviceMacSchema, siteInputSchema, toToolResult, wrapToolHandler } from '../server/common.js';

const inputSchema = siteInputSchema.extend({
    switchMac: deviceMacSchema.describe('MAC address of the switch from listDevices.'),
    start: z.number().int().nonnegative().describe('Range start, epoch milliseconds (seconds make the controller fail).'),
    end: z.number().int().nonnegative().describe('Range end, epoch milliseconds.'),
});

type Client = Pick<OmadaClient, 'getSwitchHealthDetail'>;

export function registerGetSwitchHealthDetailTool(server: McpServer, client: Client): void {
    server.registerTool(
        'getSwitchHealthDetail',
        {
            description: 'Get switch health for a time range: overall score and CPU, memory and port details. Times are epoch milliseconds.',
            inputSchema: inputSchema.shape,
        },
        wrapToolHandler('getSwitchHealthDetail', async ({ switchMac, start, end, siteId, customHeaders }) =>
            toToolResult(await client.getSwitchHealthDetail(switchMac, { start, end }, siteId, customHeaders))
        )
    );
}
