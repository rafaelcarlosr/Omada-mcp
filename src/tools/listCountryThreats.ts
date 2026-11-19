import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import type { OmadaClient } from '../omadaClient/index.js';
import { toToolResult, wrapToolHandler } from '../server/common.js';
import { createPaginationSchema } from '../utils/pagination-schema.js';
import { controllerInputSchema } from './siteAdminShared.js';

const inputSchema = controllerInputSchema.extend({
    country: z.string().trim().min(1).describe('Attacked country (ISO code) from getThreatMap.'),
    startTime: z.number().int().nonnegative().describe('Start of the period, epoch milliseconds.'),
    endTime: z.number().int().nonnegative().describe('End of the period, epoch milliseconds.'),
    severity: z.string().optional().describe('Optional severity filter: 0 very high, 1 high, 2 medium, 3 low.'),
    siteIds: z.array(z.string().trim().min(1)).max(300).optional().describe('Optional site IDs; all sites when omitted.'),
    searchKey: z.string().min(1).optional().describe('Optional search text.'),
    ...createPaginationSchema(100),
});

type Client = Pick<OmadaClient, 'listCountryThreats'>;

export function registerListCountryThreatsTool(server: McpServer, client: Client): void {
    server.registerTool(
        'listCountryThreats',
        {
            description: 'List the IPS threats against one country over a period across sites (paginated).',
            inputSchema: inputSchema.shape,
        },
        wrapToolHandler(
            'listCountryThreats',
            async ({ country, startTime, endTime, severity, siteIds, searchKey, page, pageSize, customHeaders }) => {
                if (startTime >= endTime) throw new Error('startTime must be before endTime.');
                return toToolResult(
                    await client.listCountryThreats(
                        {
                            country,
                            startTime,
                            endTime,
                            severity,
                            searchKey,
                            currentPage: page ?? 1,
                            currentPageSize: pageSize ?? 10,
                            ...(siteIds?.length ? { sites: siteIds.join(',') } : {}),
                        },
                        customHeaders
                    )
                );
            }
        )
    );
}
