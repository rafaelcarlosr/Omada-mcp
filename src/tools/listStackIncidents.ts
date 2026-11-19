import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import type { OmadaClient } from '../omadaClient/index.js';
import { siteInputSchema, toToolResult, wrapToolHandler } from '../server/common.js';
import { createPaginationSchema } from '../utils/pagination-schema.js';

const inputSchema = siteInputSchema.extend({
    stackId: z.string().trim().min(1).describe('Switch stack ID from listSitesStacks.'),
    startTime: z.number().int().nonnegative().describe('Start of the period, epoch milliseconds.'),
    endTime: z.number().int().nonnegative().describe('End of the period, epoch milliseconds.'),
    ...createPaginationSchema(),
});

type Client = Pick<OmadaClient, 'listStackIncidents'>;

export function registerListStackIncidentsTool(server: McpServer, client: Client): void {
    server.registerTool(
        'listStackIncidents',
        {
            description: 'List the incidents of one switch stack over a period (paginated).',
            inputSchema: inputSchema.shape,
        },
        wrapToolHandler('listStackIncidents', async ({ stackId, startTime, endTime, page, pageSize, siteId, customHeaders }) =>
            toToolResult(await client.listStackIncidents(stackId, { startTime, endTime }, page ?? 1, pageSize ?? 10, siteId, customHeaders))
        )
    );
}
