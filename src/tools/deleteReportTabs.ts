import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import type { OmadaClient } from '../omadaClient/index.js';
import { siteInputSchema, wrapMutationToolHandler } from '../server/common.js';
import { dryRunSchema, mutationSummary, runBatchDelete } from './resourceMutationShared.js';

const inputSchema = siteInputSchema.extend({
    tabIds: z.array(z.string().trim().min(1)).min(1).max(100).describe('Custom report tab IDs from listReportTabs.'),
    dryRun: dryRunSchema,
});

type Client = Pick<OmadaClient, 'deleteReportTabs' | 'listReportTabs'>;

export function registerDeleteReportTabsTool(server: McpServer, client: Client): void {
    server.registerTool(
        'deleteReportTabs',
        {
            description:
                'Delete custom network report tabs by ID. Built-in tabs are refused. Defaults to a preview; set dryRun:false to delete and verify they are gone.',
            inputSchema: inputSchema.shape,
            annotations: { destructiveHint: true },
        },
        wrapMutationToolHandler<typeof inputSchema.shape>(
            'deleteReportTabs',
            mutationSummary('delete-report-tabs', (args) => (args.tabIds as string[]).join(',')),
            async ({ tabIds, siteId, customHeaders, dryRun }) =>
                await runBatchDelete({
                    spec: {
                        label: 'report tab',
                        list: async () => ((await client.listReportTabs(siteId, customHeaders)) as { reportTabVOs?: unknown })?.reportTabVOs ?? [],
                        idKeys: ['tabId'],
                    },
                    ids: tabIds,
                    dryRun,
                    guard: (tab) => {
                        if (tab.type !== 1)
                            throw new Error(`"${String(tab.name)}" is a built-in report tab and cannot be deleted. No request was sent.`);
                    },
                    write: () => client.deleteReportTabs(tabIds, siteId, customHeaders),
                })
        )
    );
}
