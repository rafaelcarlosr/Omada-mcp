import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import type { OmadaClient } from '../omadaClient/index.js';
import { modifySpeedTestV2SettingOpenApiVOSchema } from '../omadaClient/requestSchemas.js';
import { siteInputSchema, wrapMutationToolHandler } from '../server/common.js';
import { dryRunSchema, mutationSummary, runSettings } from './resourceMutationShared.js';

const inputSchema = siteInputSchema.extend({
    payload: modifySpeedTestV2SettingOpenApiVOSchema.describe(
        'Speed test schedule (official ModifySpeedTestV2SettingOpenApiVO): autoSpeedTest, timingType (1 daily, 2 weekly, 3 monthly), hour, minute, dayOfWeek 0-6 or dayOfMonth 1-31.'
    ),
    dryRun: dryRunSchema,
});

type Client = Pick<OmadaClient, 'getSpeedTestSetting' | 'setSpeedTestSetting'>;

export function registerSetSpeedTestSettingTool(server: McpServer, client: Client): void {
    server.registerTool(
        'setSpeedTestSetting',
        {
            description:
                'Schedule automatic gateway speed tests daily, weekly (dayOfWeek) or monthly (dayOfMonth), or turn them off. Defaults to a preview of the current setting and differences; set dryRun:false to apply once and verify by readback.',
            inputSchema: inputSchema.shape,
            annotations: { destructiveHint: true },
        },
        wrapMutationToolHandler<typeof inputSchema.shape>(
            'setSpeedTestSetting',
            mutationSummary('set-speed-test-setting', (args) => args.siteId ?? 'default-site'),
            async ({ payload, siteId, customHeaders, dryRun }) =>
                await runSettings({
                    label: 'speed test schedule',
                    read: () => client.getSpeedTestSetting(siteId, customHeaders),
                    payload,
                    dryRun,
                    write: () => client.setSpeedTestSetting(payload, siteId, customHeaders),
                    warnings: ['Each scheduled test uses WAN bandwidth while it runs.'],
                })
        )
    );
}
