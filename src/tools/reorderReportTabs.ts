import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import type { OmadaClient } from '../omadaClient/index.js';
import { siteInputSchema, wrapMutationToolHandler } from '../server/common.js';
import { dryRunSchema, mutationSummary, type RecordLike, runSettings, toRecords } from './resourceMutationShared.js';

const inputSchema = siteInputSchema.extend({
    tabIds: z.array(z.string().trim().min(1)).min(1).max(50).describe('Every report tab ID (from listReportTabs), once, in the new order.'),
    dryRun: dryRunSchema,
});

type Client = Pick<OmadaClient, 'listReportTabs' | 'reorderReportTabs'>;

export function registerReorderReportTabsTool(server: McpServer, client: Client): void {
    server.registerTool(
        'reorderReportTabs',
        {
            description:
                'Set the order of the network report tabs. List every tab once; the complete tabs are sent back unchanged apart from their rank, so no card is lost. Defaults to a preview; set dryRun:false to apply and verify the order.',
            inputSchema: inputSchema.shape,
            annotations: { destructiveHint: true },
        },
        wrapMutationToolHandler<typeof inputSchema.shape>(
            'reorderReportTabs',
            mutationSummary('reorder-report-tabs', () => 'site'),
            async ({ tabIds, siteId, customHeaders, dryRun }) => {
                const read = async (): Promise<RecordLike[]> => {
                    const result = (await client.listReportTabs(siteId, customHeaders)) as { reportTabVOs?: unknown } | undefined;
                    return toRecords(result?.reportTabVOs);
                };
                const tabs = await read();
                const known = tabs.map((tab) => String(tab.tabId));
                const unknown = tabIds.filter((id) => !known.includes(id));
                const missing = known.filter((id) => !tabIds.includes(id));
                if (unknown.length || missing.length || new Set(tabIds).size !== tabIds.length) {
                    throw new Error(
                        `List every report tab exactly once (unknown: ${unknown.join(', ') || 'none'}; missing: ${missing.join(', ') || 'none'}). No request was sent.`
                    );
                }
                const order = (rows: RecordLike[]): string[] =>
                    [...rows].sort((a, b) => Number(a.rank) - Number(b.rank)).map((tab) => String(tab.tabId));
                return await runSettings({
                    label: 'report tab order',
                    read: async () => ({ order: order(await read()) }),
                    payload: { order: tabIds },
                    dryRun,
                    write: () =>
                        client.reorderReportTabs(
                            tabs.map((tab) => ({ ...tab, tabId: String(tab.tabId), rank: tabIds.indexOf(String(tab.tabId)) + 1 })),
                            siteId,
                            customHeaders
                        ),
                });
            }
        )
    );
}
