import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import type { OmadaClient } from '../omadaClient/index.js';
import { reportTabPayloadSchema } from '../omadaClient/monitoring.js';
import { siteInputSchema, wrapMutationToolHandler } from '../server/common.js';
import { dryRunSchema, mutationSummary, runUpdate } from './resourceMutationShared.js';

const inputSchema = siteInputSchema.extend({
    tabId: z.string().trim().min(1).describe('Custom report tab ID from listReportTabs.'),
    payload: reportTabPayloadSchema.describe('Complete custom report tab: name, status and cardGroupList.'),
    dryRun: dryRunSchema,
});

type Client = Pick<OmadaClient, 'listReportTabs' | 'updateReportTab'>;

export function registerUpdateReportTabTool(server: McpServer, client: Client): void {
    server.registerTool(
        'updateReportTab',
        {
            description:
                'Replace a custom network report tab (name, status, card groups). Built-in tabs are refused. Defaults to a preview; set dryRun:false to apply once and verify by readback.',
            inputSchema: inputSchema.shape,
            annotations: { destructiveHint: true },
        },
        wrapMutationToolHandler<typeof inputSchema.shape>(
            'updateReportTab',
            mutationSummary('update-report-tab', (args) => String(args.tabId)),
            async ({ tabId, payload, siteId, customHeaders, dryRun }) =>
                await runUpdate({
                    spec: {
                        label: 'report tab',
                        list: async () => ((await client.listReportTabs(siteId, customHeaders)) as { reportTabVOs?: unknown })?.reportTabVOs ?? [],
                        idKeys: ['tabId'],
                    },
                    id: tabId,
                    payload,
                    dryRun,
                    guard: (tab) => {
                        if (tab.type !== 1)
                            throw new Error(`"${String(tab.name)}" is a built-in report tab and cannot be changed. No request was sent.`);
                    },
                    write: () => client.updateReportTab(tabId, payload, siteId, customHeaders),
                })
        )
    );
}
