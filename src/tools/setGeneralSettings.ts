import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import { generalSettingsPayloadSchema } from '../omadaClient/controllerSettings.js';
import type { OmadaClient } from '../omadaClient/index.js';
import { wrapMutationToolHandler } from '../server/common.js';
import { dryRunSchema, mutationSummary, runSettings } from './resourceMutationShared.js';
import { controllerInputSchema } from './siteAdminShared.js';

const inputSchema = controllerInputSchema.extend({
    payload: generalSettingsPayloadSchema.describe(
        'General settings (official General Setting): name (1-32 visible ASCII), timeZone, region and optional dst { mode 0 off, 1 auto, 2 manual, start, end, offset }.'
    ),
    dryRun: dryRunSchema,
});

type Client = Pick<OmadaClient, 'getGeneralSettings' | 'setGeneralSettings'>;

export function registerSetGeneralSettingsTool(server: McpServer, client: Client): void {
    server.registerTool(
        'setGeneralSettings',
        {
            description:
                'Change the controller name, region, time zone and daylight saving setting. Defaults to a preview of the current setting and differences; set dryRun:false to apply once and verify by readback.',
            inputSchema: inputSchema.shape,
            annotations: { destructiveHint: true },
        },
        wrapMutationToolHandler<typeof inputSchema.shape>(
            'setGeneralSettings',
            mutationSummary('set-general-settings', () => 'controller'),
            async ({ payload, customHeaders, dryRun }) =>
                await runSettings({
                    label: 'controller general settings',
                    read: () => client.getGeneralSettings(customHeaders),
                    payload,
                    dryRun,
                    write: () => client.setGeneralSettings(payload, customHeaders),
                    warnings: ['The controller time zone changes timestamps of controller-level logs and schedules.'],
                })
        )
    );
}
