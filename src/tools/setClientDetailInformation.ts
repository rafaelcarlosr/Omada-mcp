import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import { clientDetailPayloadSchema } from '../omadaClient/controllerSettings.js';
import type { OmadaClient } from '../omadaClient/index.js';
import { wrapMutationToolHandler } from '../server/common.js';
import { dryRunSchema, mutationSummary, runSettings } from './resourceMutationShared.js';
import { controllerInputSchema } from './siteAdminShared.js';

const inputSchema = controllerInputSchema.extend({
    payload: clientDetailPayloadSchema.describe(
        'Client detail switches (official ClientDetailInformationSettingVO): clientRecognitionEnable, clientHealthEnable, clientHistoryEnable and clientDataTrendEnable, all four required; followMsp for MSP customers.'
    ),
    dryRun: dryRunSchema,
});

type Client = Pick<OmadaClient, 'getClientDetailInformation' | 'setClientDetailInformation'>;

export function registerSetClientDetailInformationTool(server: McpServer, client: Client): void {
    server.registerTool(
        'setClientDetailInformation',
        {
            description:
                'Turn client recognition, client health, client history and client data trend recording on or off. Defaults to a preview of the current setting and differences; set dryRun:false to apply once and verify by readback.',
            inputSchema: inputSchema.shape,
            annotations: { destructiveHint: true },
        },
        wrapMutationToolHandler<typeof inputSchema.shape>(
            'setClientDetailInformation',
            mutationSummary('set-client-detail-information', () => 'controller'),
            async ({ payload, customHeaders, dryRun }) =>
                await runSettings({
                    label: 'client detail information',
                    read: async () => ((await client.getClientDetailInformation(customHeaders)) as { switches?: unknown } | undefined)?.switches,
                    payload,
                    dryRun,
                    write: () => client.setClientDetailInformation(payload, customHeaders),
                    warnings: ['Client history and data trends use a lot of controller storage.'],
                })
        )
    );
}
