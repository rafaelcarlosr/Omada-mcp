import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import type { OmadaClient } from '../omadaClient/index.js';
import { siteInputSchema, wrapMutationToolHandler } from '../server/common.js';
import { dryRunSchema, findRecord, mutationSummary, runAction, toRecords } from './resourceMutationShared.js';

const inputSchema = siteInputSchema.extend({
    logIds: z
        .array(z.string().trim().min(1))
        .min(1)
        .max(1000)
        .describe('IDs of the alert logs to mark resolved, from listSiteAlerts in the same period.'),
    startTime: z.number().int().nonnegative().describe('Start of the period that contains the alerts, epoch milliseconds.'),
    endTime: z.number().int().nonnegative().describe('End of the period that contains the alerts, epoch milliseconds.'),
    dryRun: dryRunSchema,
});

type Client = Pick<OmadaClient, 'listSiteAlerts' | 'resolveSiteAlerts'>;

export function registerResolveSiteAlertsTool(server: McpServer, client: Client): void {
    server.registerTool(
        'resolveSiteAlerts',
        {
            description:
                'Mark selected site alert logs as resolved, by ID. Only the listed IDs are resolved, never "all". Defaults to a preview of the alerts; set dryRun:false to resolve.',
            inputSchema: inputSchema.shape,
            annotations: { destructiveHint: true },
        },
        wrapMutationToolHandler<typeof inputSchema.shape>(
            'resolveSiteAlerts',
            mutationSummary('resolve-site-alerts', (args) => `${(args.logIds as string[]).length} alert(s)`),
            async ({ logIds, startTime, endTime, siteId, customHeaders, dryRun }) =>
                await runAction({
                    label: 'alert resolution',
                    dryRun,
                    preflight: async () => {
                        if (startTime >= endTime) throw new Error('startTime must be before endTime.');
                        const alerts = toRecords(
                            (await client.listSiteAlerts({ page: 1, pageSize: 1000, startTime, endTime }, siteId, customHeaders))?.data ?? []
                        );
                        const missing = logIds.filter((id) => !findRecord(alerts, id));
                        if (missing.length) throw new Error(`No alert log with id ${missing.join(', ')} in this period. No request was sent.`);
                        return { alerts: logIds.map((id) => findRecord(alerts, id)) };
                    },
                    write: () => client.resolveSiteAlerts({ logIds, startTime, endTime }, siteId, customHeaders),
                })
        )
    );
}
