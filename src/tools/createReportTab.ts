import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import type { OmadaClient } from '../omadaClient/index.js';
import { reportTabPayloadSchema } from '../omadaClient/monitoring.js';
import { siteInputSchema, wrapMutationToolHandler } from '../server/common.js';
import { dryRunSchema, mutationSummary, runCreate } from './resourceMutationShared.js';

const inputSchema = siteInputSchema.extend({
    payload: reportTabPayloadSchema.describe('Custom report tab: name, status (1 enabled) and cardGroupList.'),
    dryRun: dryRunSchema,
});

type Client = Pick<OmadaClient, 'createReportTab' | 'listReportTabs'>;

export function registerCreateReportTabTool(server: McpServer, client: Client): void {
    server.registerTool(
        'createReportTab',
        {
            description:
                'Create a custom network report tab with the chosen card groups. Defaults to a preview; set dryRun:false to create once and verify by readback.',
            inputSchema: inputSchema.shape,
            annotations: { destructiveHint: true },
        },
        wrapMutationToolHandler<typeof inputSchema.shape>(
            'createReportTab',
            mutationSummary('create-report-tab', (args) => String((args.payload as { name?: unknown }).name)),
            async ({ payload, siteId, customHeaders, dryRun }) =>
                await runCreate({
                    spec: {
                        label: 'report tab',
                        list: async () => ((await client.listReportTabs(siteId, customHeaders)) as { reportTabVOs?: unknown })?.reportTabVOs ?? [],
                        idKeys: ['tabId'],
                    },
                    payload,
                    dryRun,
                    write: () => client.createReportTab(payload, siteId, customHeaders),
                })
        )
    );
}
