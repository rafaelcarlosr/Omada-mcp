import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import type { OmadaClient } from '../omadaClient/index.js';
import { toToolResult, wrapToolHandler } from '../server/common.js';
import { controllerInputSchema } from './siteAdminShared.js';

const inputSchema = controllerInputSchema.extend({
    start: z.number().int().nonnegative().describe('Start of the period, epoch milliseconds.'),
    end: z.number().int().nonnegative().describe('End of the period, epoch milliseconds.'),
    severity: z.string().optional().describe('Optional severity filter: 0 very high, 1 high, 2 medium, 3 low.'),
    country: z.string().optional().describe('Optional attacked country (ISO code).'),
    siteIds: z.array(z.string().trim().min(1)).max(300).optional().describe('Optional site IDs; all sites when omitted.'),
});

type Client = Pick<OmadaClient, 'getThreatCategoryCounts'>;

export function registerGetThreatCategoryCountsTool(server: McpServer, client: Client): void {
    server.registerTool(
        'getThreatCategoryCounts',
        {
            description: 'Get controller-wide IPS threat counts per category over a period, optionally by severity, country and sites.',
            inputSchema: inputSchema.shape,
        },
        wrapToolHandler('getThreatCategoryCounts', async ({ start, end, severity, country, siteIds, customHeaders }) => {
            if (start >= end) throw new Error('start must be before end.');
            return toToolResult(
                await client.getThreatCategoryCounts(
                    { start, end, severity, country, ...(siteIds?.length ? { sites: siteIds.join(',') } : {}) },
                    customHeaders
                )
            );
        })
    );
}
