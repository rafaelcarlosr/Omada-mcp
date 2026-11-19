import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import type { OmadaClient } from '../omadaClient/index.js';
import { siteInputSchema, wrapMutationToolHandler } from '../server/common.js';
import { dryRunSchema, findRecord, mutationSummary, runAction, toRecords } from './resourceMutationShared.js';

const inputSchema = siteInputSchema.extend({
    tabId: z.string().trim().min(1).describe('Dashboard tab ID from listDashboardTabs.'),
    dryRun: dryRunSchema,
});

type Client = Pick<OmadaClient, 'listDashboardTabs' | 'updateDashboardTab'>;

/** Tab types 0-2 are the built-in Overall, Network and Clients tabs; 3 is custom. */
const CUSTOM_TAB = 3;

export function registerResetDashboardTabTool(server: McpServer, client: Client): void {
    server.registerTool(
        'resetDashboardTab',
        {
            description:
                'Reset a built-in dashboard tab (Overall, Network, Clients) to its default name and cards. Custom tabs are refused. Defaults to a preview; set dryRun:false to reset.',
            inputSchema: inputSchema.shape,
            annotations: { destructiveHint: true },
        },
        wrapMutationToolHandler<typeof inputSchema.shape>(
            'resetDashboardTab',
            mutationSummary('reset-dashboard-tab', (args) => String(args.tabId)),
            async ({ tabId, siteId, customHeaders, dryRun }) =>
                await runAction({
                    label: 'dashboard tab reset',
                    dryRun,
                    preflight: async () => {
                        const tab = findRecord(toRecords(await client.listDashboardTabs(siteId, customHeaders)), tabId);
                        if (!tab) throw new Error(`No dashboard tab with id "${tabId}" exists. No request was sent.`);
                        if (tab.type === CUSTOM_TAB)
                            throw new Error(`"${String(tab.name)}" is a custom tab; only built-in tabs can be reset. No request was sent.`);
                        return { tab };
                    },
                    write: () => client.updateDashboardTab(tabId, { reset: true }, siteId, customHeaders),
                })
        )
    );
}
