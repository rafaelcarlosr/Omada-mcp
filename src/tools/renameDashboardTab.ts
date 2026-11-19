import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import type { OmadaClient } from '../omadaClient/index.js';
import { siteInputSchema, wrapMutationToolHandler } from '../server/common.js';
import { dryRunSchema, mutationSummary, runUpdate } from './resourceMutationShared.js';

const inputSchema = siteInputSchema.extend({
    tabId: z.string().trim().min(1).describe('Dashboard tab ID from listDashboardTabs.'),
    name: z.string().min(1).max(32).describe('Tab name, unique on the dashboard.'),
    dryRun: dryRunSchema,
});

type Client = Pick<OmadaClient, 'listDashboardTabs' | 'updateDashboardTab'>;

export function registerRenameDashboardTabTool(server: McpServer, client: Client): void {
    server.registerTool(
        'renameDashboardTab',
        {
            description: 'Rename a dashboard tab. Defaults to a preview; set dryRun:false to apply once and verify by readback.',
            inputSchema: inputSchema.shape,
            annotations: { destructiveHint: true },
        },
        wrapMutationToolHandler<typeof inputSchema.shape>(
            'renameDashboardTab',
            mutationSummary('rename-dashboard-tab', (args) => String(args.tabId)),
            async ({ tabId, name, siteId, customHeaders, dryRun }) =>
                await runUpdate({
                    spec: { label: 'dashboard tab', list: () => client.listDashboardTabs(siteId, customHeaders) },
                    id: tabId,
                    payload: { name },
                    dryRun,
                    write: () => client.updateDashboardTab(tabId, { name }, siteId, customHeaders),
                })
        )
    );
}
