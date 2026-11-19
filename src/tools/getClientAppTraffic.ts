import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import type { OmadaClient } from '../omadaClient/index.js';
import { deviceMacSchema, siteInputSchema, toToolResult, wrapToolHandler } from '../server/common.js';

const inputSchema = siteInputSchema.extend({
    clientMac: deviceMacSchema.describe('Client MAC address, e.g. AA-BB-CC-DD-EE-01.'),
    start: z.number().int().nonnegative().describe('Start of the period, epoch seconds.'),
    end: z.number().int().nonnegative().describe('End of the period, epoch seconds.'),
});

type Client = Pick<OmadaClient, 'getClientAppTraffic'>;

export function registerGetClientAppTrafficTool(server: McpServer, client: Client): void {
    server.registerTool(
        'getClientAppTraffic',
        {
            description: 'Get the applications a client used and their traffic over a period (needs gateway DPI).',
            inputSchema: inputSchema.shape,
        },
        wrapToolHandler('getClientAppTraffic', async ({ clientMac, start, end, siteId, customHeaders }) =>
            toToolResult(await client.getClientAppTraffic(clientMac, { start, end }, siteId, customHeaders))
        )
    );
}
