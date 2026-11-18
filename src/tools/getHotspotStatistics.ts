import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import type { OmadaClient } from '../omadaClient/index.js';
import { siteInputSchema, toToolResult, wrapToolHandler } from '../server/common.js';

const inputSchema = siteInputSchema.extend({
    start: z.number().int().nonnegative().optional().describe('Range start, Unix epoch seconds.'),
    end: z.number().int().nonnegative().optional().describe('Range end, Unix epoch seconds.'),
});

type Client = Pick<OmadaClient, 'getHotspotStatistics'>;

export function registerGetHotspotStatisticsTool(server: McpServer, client: Client): void {
    server.registerTool(
        'getHotspotStatistics',
        {
            description: 'Get hotspot dashboard statistics: recent connections (new vs returning) and the distribution of authentication types.',
            inputSchema: inputSchema.shape,
        },
        wrapToolHandler('getHotspotStatistics', async ({ start, end, siteId, customHeaders }) =>
            toToolResult(await client.getHotspotStatistics({ start, end }, siteId, customHeaders))
        )
    );
}
