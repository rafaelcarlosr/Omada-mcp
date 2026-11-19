import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import type { OmadaClient } from '../omadaClient/index.js';
import { siteInputSchema, toToolResult, wrapToolHandler } from '../server/common.js';
import { createPaginationSchema } from '../utils/pagination-schema.js';

const inputSchema = siteInputSchema.extend({
    start: z.number().int().nonnegative().describe('Start of the period, epoch seconds.'),
    end: z.number().int().nonnegative().describe('End of the period, epoch seconds.'),
    ...createPaginationSchema(),
});

type Client = Pick<OmadaClient, 'listClientTraffic'>;

export function registerListClientTrafficTool(server: McpServer, client: Client): void {
    server.registerTool(
        'listClientTraffic',
        {
            description: 'List client traffic over a period (paginated).',
            inputSchema: inputSchema.shape,
        },
        wrapToolHandler('listClientTraffic', async ({ start, end, page, pageSize, siteId, customHeaders }) =>
            toToolResult(await client.listClientTraffic({ start, end }, page ?? 1, pageSize ?? 10, siteId, customHeaders))
        )
    );
}
