import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import type { OmadaClient } from '../omadaClient/index.js';
import { siteInputSchema, wrapMutationToolHandler } from '../server/common.js';
import { dryRunSchema, mutationSummary, runDelete } from './resourceMutationShared.js';

const inputSchema = siteInputSchema.extend({
    tabId: z.string().trim().min(1).describe('Dashboard tab ID from listDashboardTabs.'),
    dryRun: dryRunSchema,
});

type Client = Pick<OmadaClient, 'deleteDashboardTab' | 'listDashboardTabs'>;

export function registerDeleteDashboardTabTool(server: McpServer, client: Client): void {
    server.registerTool(
        'deleteDashboardTab',
        {
            description:
                'Delete a dashboard tab. The Overall tab is refused, and built-in Network and Clients tabs cannot be recreated once deleted. Defaults to a preview; set dryRun:false to delete and verify it is gone.',
            inputSchema: inputSchema.shape,
            annotations: { destructiveHint: true },
        },
        wrapMutationToolHandler<typeof inputSchema.shape>(
            'deleteDashboardTab',
            mutationSummary('delete-dashboard-tab', (args) => String(args.tabId)),
            async ({ tabId, siteId, customHeaders, dryRun }) =>
                await runDelete({
                    spec: { label: 'dashboard tab', list: () => client.listDashboardTabs(siteId, customHeaders) },
                    id: tabId,
                    dryRun,
                    guard: (tab) => {
                        if (tab.type === 0) throw new Error('The Overall tab cannot be deleted. No request was sent.');
                    },
                    write: () => client.deleteDashboardTab(tabId, siteId, customHeaders),
                    warnings: ['Built-in tabs (Network, Clients) cannot be recreated with their original identity once deleted.'],
                })
        )
    );
}
