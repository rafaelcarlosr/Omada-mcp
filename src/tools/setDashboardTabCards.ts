import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import type { OmadaClient } from '../omadaClient/index.js';
import { siteInputSchema, wrapMutationToolHandler } from '../server/common.js';
import { dryRunSchema, findRecord, mutationSummary, runSettings, toRecords } from './resourceMutationShared.js';

const inputSchema = siteInputSchema.extend({
    tabId: z.string().trim().min(1).describe('Dashboard tab ID from listDashboardTabs.'),
    cards: z
        .array(z.number().int().nonnegative())
        .max(50)
        .describe(
            'Card IDs in display order, e.g. 101 alerts, 102 ISP load, 104 channel distribution, 105 most active EAPs, 106 most active switches, 108 WiFi/switching summary, 109 traffic distribution, 110 traffic activities, 111 client distribution, 112 retry/dropped rate, 117 top CPU/memory, 200-203 client cards.'
        ),
    dryRun: dryRunSchema,
});

type Client = Pick<OmadaClient, 'listDashboardTabs' | 'setDashboardTabs'>;

export function registerSetDashboardTabCardsTool(server: McpServer, client: Client): void {
    server.registerTool(
        'setDashboardTabCards',
        {
            description:
                'Set the cards shown on one dashboard tab. The controller replaces the whole tab set on this route and deletes tabs left out, so the tool always sends every current tab and changes only this one. Defaults to a preview; set dryRun:false to apply once and verify by readback.',
            inputSchema: inputSchema.shape,
            annotations: { destructiveHint: true },
        },
        wrapMutationToolHandler<typeof inputSchema.shape>(
            'setDashboardTabCards',
            mutationSummary('set-dashboard-tab-cards', (args) => String(args.tabId)),
            async ({ tabId, cards, siteId, customHeaders, dryRun }) => {
                const readTab = async (): Promise<unknown> => findRecord(toRecords(await client.listDashboardTabs(siteId, customHeaders)), tabId);
                if (!(await readTab())) throw new Error(`No dashboard tab with id "${tabId}" exists. No request was sent.`);
                return await runSettings({
                    label: 'dashboard tab cards',
                    read: readTab,
                    payload: { cards },
                    dryRun,
                    write: async () => {
                        const tabs = toRecords(await client.listDashboardTabs(siteId, customHeaders)).map((tab) => ({
                            id: String(tab.id),
                            cards: tab.id === tabId ? cards : ((tab.cards as number[] | undefined) ?? []),
                        }));
                        return await client.setDashboardTabs({ tabs }, siteId, customHeaders);
                    },
                });
            }
        )
    );
}
