import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import { controllerRetentionPayloadSchema } from '../omadaClient/controllerSettings.js';
import type { OmadaClient } from '../omadaClient/index.js';
import { wrapMutationToolHandler } from '../server/common.js';
import { dryRunSchema, mutationSummary, runSettings } from './resourceMutationShared.js';
import { controllerInputSchema } from './siteAdminShared.js';

const inputSchema = controllerInputSchema.extend({
    payload: controllerRetentionPayloadSchema.describe(
        'Retention (official History Retention) without the read-only available-day lists and fixed 5-minute, 10-minute and hourly values: clientsDataEnable plus the retention days of each data type.'
    ),
    dryRun: dryRunSchema,
});

type Client = Pick<OmadaClient, 'getRetention' | 'setControllerRetention'>;

export function registerSetControllerRetentionTool(server: McpServer, client: Client): void {
    server.registerTool(
        'setControllerRetention',
        {
            description:
                'Change controller data retention (client history, known clients, daily and weekly statistics, portal authentications, logs, rogue APs, WIDS) through the controller-settings route. Defaults to a preview of the current setting and differences; set dryRun:false to apply once and verify by readback.',
            inputSchema: inputSchema.shape,
            annotations: { destructiveHint: true },
        },
        wrapMutationToolHandler<typeof inputSchema.shape>(
            'setControllerRetention',
            mutationSummary('set-controller-retention', () => 'controller'),
            async ({ payload, customHeaders, dryRun }) =>
                await runSettings({
                    label: 'data retention',
                    read: () => client.getRetention(customHeaders),
                    payload,
                    dryRun,
                    write: () => client.setControllerRetention(payload, customHeaders),
                    warnings: ['Shorter retention deletes older history at the next cleanup.'],
                })
        )
    );
}
