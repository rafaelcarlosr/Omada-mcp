import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import type { OmadaClient } from '../omadaClient/index.js';
import { sshSettingPayloadSchema } from '../omadaClient/serviceSettings.js';
import { siteInputSchema, wrapMutationToolHandler } from '../server/common.js';
import { dryRunSchema, mutationSummary } from './resourceMutationShared.js';
import { runMergedSettings } from './settingsShared.js';

const inputSchema = siteInputSchema.extend({
    changes: sshSettingPayloadSchema
        .partial()
        .refine((value) => Object.keys(value).length > 0, 'At least one change is required.')
        .describe('Fields to change: sshEnable, sshServerPort (22 or 1025-65535) and layer3Access.'),
    dryRun: dryRunSchema,
});

type Client = Pick<OmadaClient, 'getSshSetting' | 'setSshSetting'>;

export function registerSetSshSettingTool(server: McpServer, client: Client): void {
    server.registerTool(
        'setSshSetting',
        {
            description:
                'Change device SSH access for the site: on or off, port and layer-3 reachability. Turning it on exposes device shells with the site device account. Unlisted fields keep their current values. Defaults to a preview; set dryRun:false to apply once and verify by readback.',
            inputSchema: inputSchema.shape,
            annotations: { destructiveHint: true },
        },
        wrapMutationToolHandler<typeof inputSchema.shape>(
            'setSshSetting',
            mutationSummary('setSshSetting', () => 'site'),
            async ({ changes, siteId, customHeaders, dryRun }) =>
                await runMergedSettings({
                    label: 'SSH',
                    schema: sshSettingPayloadSchema,
                    read: () => client.getSshSetting(siteId, customHeaders),
                    changes,
                    dryRun,
                    write: (payload) => client.setSshSetting(payload, siteId, customHeaders),
                    warnings: (payload) =>
                        payload.sshEnable ? ['Device SSH is reachable with the site device account; restrict it to management networks.'] : [],
                })
        )
    );
}
