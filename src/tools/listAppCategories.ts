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

type Client = Pick<OmadaClient, 'listAppCategories'>;

export function registerListAppCategoriesTool(server: McpServer, client: Client): void {
    server.registerTool(
        'listAppCategories',
        {
            description: 'List application categories with traffic over a period and the allowed/blocked app counts (paginated).',
            inputSchema: inputSchema.shape,
        },
        wrapToolHandler('listAppCategories', async ({ start, end, page, pageSize, siteId, customHeaders }) =>
            toToolResult(await client.listAppCategories({ start, end }, page ?? 1, pageSize ?? 10, siteId, customHeaders))
        )
    );
}
