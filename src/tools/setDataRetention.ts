import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import { dataRetentionPayloadSchema } from '../omadaClient/controllerSettings.js';
import type { OmadaClient } from '../omadaClient/index.js';
import { wrapMutationToolHandler } from '../server/common.js';
import { dryRunSchema, mutationSummary, runSettings } from './resourceMutationShared.js';
import { controllerInputSchema } from './siteAdminShared.js';

const inputSchema = controllerInputSchema.extend({
    payload: dataRetentionPayloadSchema.describe(
        'Retention (official ModifyHistoryRetentionOpenApiVO) without the MSP-only override: clientsDataEnable plus the retention days of each data type.'
    ),
    dryRun: dryRunSchema,
});

type Client = Pick<OmadaClient, 'getDataRetention' | 'setDataRetention'>;

export function registerSetDataRetentionTool(server: McpServer, client: Client): void {
    server.registerTool(
        'setDataRetention',
        {
            description:
                'Change controller history data retention (client history, known clients, statistics, portal authentications, logs, rogue APs, WIDS) through the maintenance route. Defaults to a preview of the current setting and differences; set dryRun:false to apply once and verify by readback.',
            inputSchema: inputSchema.shape,
            annotations: { destructiveHint: true },
        },
        wrapMutationToolHandler<typeof inputSchema.shape>(
            'setDataRetention',
            mutationSummary('set-data-retention', () => 'controller'),
            async ({ payload, customHeaders, dryRun }) =>
                await runSettings({
                    label: 'data retention',
                    read: () => client.getDataRetention(customHeaders),
                    payload,
                    dryRun,
                    write: () => client.setDataRetention(payload, customHeaders),
                    warnings: ['Shorter retention deletes older history at the next cleanup.'],
                })
        )
    );
}
