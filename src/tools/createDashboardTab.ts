import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import type { OmadaClient } from '../omadaClient/index.js';
import { siteInputSchema, wrapMutationToolHandler } from '../server/common.js';
import { dryRunSchema, mutationSummary, runCreate } from './resourceMutationShared.js';

const inputSchema = siteInputSchema.extend({
    name: z.string().min(1).max(32).describe('Tab name, unique on the dashboard.'),
    dryRun: dryRunSchema,
});

type Client = Pick<OmadaClient, 'createDashboardTab' | 'listDashboardTabs'>;

export function registerCreateDashboardTabTool(server: McpServer, client: Client): void {
    server.registerTool(
        'createDashboardTab',
        {
            description:
                'Create an empty custom dashboard tab; add cards with setDashboardTabCards. Defaults to a preview; set dryRun:false to create once and verify by readback.',
            inputSchema: inputSchema.shape,
            annotations: { destructiveHint: true },
        },
        wrapMutationToolHandler<typeof inputSchema.shape>(
            'createDashboardTab',
            mutationSummary('create-dashboard-tab', (args) => String(args.name)),
            async ({ name, siteId, customHeaders, dryRun }) =>
                await runCreate({
                    spec: { label: 'dashboard tab', list: () => client.listDashboardTabs(siteId, customHeaders) },
                    payload: { name },
                    dryRun,
                    write: () => client.createDashboardTab(name, siteId, customHeaders),
                })
        )
    );
}
