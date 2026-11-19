import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import type { OmadaClient } from '../omadaClient/index.js';
import { customHeadersSchema, toToolResult, wrapToolHandler } from '../server/common.js';
import { createPaginationSchema } from '../utils/pagination-schema.js';

export function registerListSiteThreatManagementTool(server: McpServer, client: OmadaClient): void {
    const inputSchema = z.object({
        ...createPaginationSchema(100),
        siteId: z.string().min(1).optional(),
        startTime: z.number().int().nonnegative().optional().describe('Start of the period, epoch seconds. Defaults to 24 hours before endTime.'),
        endTime: z.number().int().nonnegative().optional().describe('End of the period, epoch seconds. Defaults to now.'),
        archived: z.boolean().optional().describe('List archived threats instead of current ones. Defaults to false.'),
        searchKey: z.string().optional().describe('Search keyword for filtering threats'),
        customHeaders: customHeadersSchema,
    });

    server.registerTool(
        'listSiteThreatManagement',
        {
            description:
                'List site-level threat management events detected by IPS over a period (the last 24 hours by default), with keyword filtering.',
            inputSchema: inputSchema.shape,
        },
        wrapToolHandler('listSiteThreatManagement', async (args) =>
            toToolResult(
                await client.listSiteThreatManagement(
                    {
                        page: args.page,
                        pageSize: args.pageSize,
                        startTime: args.startTime,
                        endTime: args.endTime,
                        archived: args.archived,
                        searchKey: args.searchKey,
                    },
                    args.siteId,
                    args.customHeaders
                )
            )
        )
    );
}
