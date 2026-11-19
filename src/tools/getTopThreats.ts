import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import type { OmadaClient } from '../omadaClient/index.js';
import { customHeadersSchema, toToolResult, wrapToolHandler } from '../server/common.js';

export function registerGetTopThreatsTool(server: McpServer, client: OmadaClient): void {
    const inputSchema = z.object({
        startTime: z.number().int().nonnegative().optional().describe('Start of the period, epoch seconds. Defaults to 24 hours before endTime.'),
        endTime: z.number().int().nonnegative().optional().describe('End of the period, epoch seconds. Defaults to now.'),
        customHeaders: customHeadersSchema,
    });

    server.registerTool(
        'getTopThreats',
        {
            description:
                'Get the top threats across all sites over a period (the last 24 hours by default): attacking countries and threat classifications.',
            inputSchema: inputSchema.shape,
        },
        wrapToolHandler('getTopThreats', async ({ startTime, endTime, customHeaders }) =>
            toToolResult(await client.getTopThreats(customHeaders, { startTime, endTime }))
        )
    );
}
