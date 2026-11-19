import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import type { OmadaClient } from '../omadaClient/index.js';
import * as schemas from '../omadaClient/requestSchemas.js';
import { siteInputSchema, wrapMutationToolHandler } from '../server/common.js';
import { dryRunSchema, mutationSummary } from './resourceMutationShared.js';
import { runMergedSettings } from './settingsShared.js';

const inputSchema = siteInputSchema.extend({
    changes: schemas.macFilteringGeneralSettingSchema
        .partial()
        .refine((value) => Object.keys(value).length > 0, 'At least one change is required.')
        .describe('Fields to change: enable, filterMode (0 allow-list, 1 deny-list) and direction.'),
    dryRun: dryRunSchema,
});

type Client = Pick<OmadaClient, 'getMacFilteringGeneralSetting' | 'setMacFilteringGeneralSetting'>;

export function registerSetMacFilteringGeneralSettingTool(server: McpServer, client: Client): void {
    server.registerTool(
        'setMacFilteringGeneralSetting',
        {
            description:
                'Change gateway MAC filtering: on or off, allow-list or deny-list mode and the traffic directions it applies to. An allow-list blocks every MAC not listed. Unlisted fields keep their current values. Defaults to a preview; set dryRun:false to apply once and verify by readback.',
            inputSchema: inputSchema.shape,
            annotations: { destructiveHint: true },
        },
        wrapMutationToolHandler<typeof inputSchema.shape>(
            'setMacFilteringGeneralSetting',
            mutationSummary('setMacFilteringGeneralSetting', () => 'site'),
            async ({ changes, siteId, customHeaders, dryRun }) =>
                await runMergedSettings({
                    label: 'MAC filtering',
                    schema: schemas.macFilteringGeneralSettingSchema,
                    read: () => client.getMacFilteringGeneralSetting(siteId, customHeaders),
                    changes,
                    dryRun,
                    write: (payload) => client.setMacFilteringGeneralSetting(payload, siteId, customHeaders),
                    // While off, the controller reads back only the switch.
                    verifyView: (payload) => (payload.enable ? payload : { enable: false }),
                    warnings: (payload) =>
                        payload.enable && payload.filterMode === 0 ? ['In allow-list mode every device whose MAC is not listed is blocked.'] : [],
                })
        )
    );
}
