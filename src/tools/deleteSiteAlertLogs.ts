import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import type { OmadaClient } from '../omadaClient/index.js';
import { siteInputSchema, wrapMutationToolHandler } from '../server/common.js';
import { dryRunSchema, mutationSummary, runBatchDelete, toRecords } from './resourceMutationShared.js';

const inputSchema = siteInputSchema.extend({
    logIds: z.array(z.string().trim().min(1)).min(1).max(1000).describe('IDs of the alert logs to delete, from listSiteAlerts in the same period.'),
    startTime: z.number().int().nonnegative().describe('Start of the period that contains the logs, epoch milliseconds.'),
    endTime: z.number().int().nonnegative().describe('End of the period that contains the logs, epoch milliseconds.'),
    dryRun: dryRunSchema,
});

type Client = Pick<OmadaClient, 'listSiteAlerts' | 'deleteSiteAlertLogs'>;

export function registerDeleteSiteAlertLogsTool(server: McpServer, client: Client): void {
    server.registerTool(
        'deleteSiteAlertLogs',
        {
            description:
                'Delete selected site alert logs by ID. Only the listed IDs are deleted, never "all"; every ID must appear in the period. Deleted logs cannot be restored. Defaults to a preview of the logs; set dryRun:false to delete and verify they are gone.',
            inputSchema: inputSchema.shape,
            annotations: { destructiveHint: true },
        },
        wrapMutationToolHandler<typeof inputSchema.shape>(
            'deleteSiteAlertLogs',
            mutationSummary('delete-site-alert-logs', (args) => `${(args.logIds as string[]).length} log(s)`),
            async ({ logIds, startTime, endTime, siteId, customHeaders, dryRun }) => {
                if (startTime >= endTime) throw new Error('startTime must be before endTime.');
                return await runBatchDelete({
                    spec: {
                        label: 'alert log',
                        list: async () =>
                            toRecords(
                                (await client.listSiteAlerts({ page: 1, pageSize: 1000, startTime, endTime }, siteId, customHeaders))?.data ?? []
                            ),
                        nameKey: null,
                    },
                    ids: logIds,
                    dryRun,
                    write: () => client.deleteSiteAlertLogs({ logIds, startTime, endTime }, siteId, customHeaders),
                    warnings: ['Deleted logs cannot be restored.'],
                });
            }
        )
    );
}
