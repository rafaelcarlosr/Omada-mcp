import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import type { OmadaClient } from '../omadaClient/index.js';
import { intelliRecoverPayloadSchema } from '../omadaClient/siteServices.js';
import { siteInputSchema, wrapMutationToolHandler } from '../server/common.js';
import { dryRunSchema, mutationSummary, runSettings } from './resourceMutationShared.js';

const inputSchema = siteInputSchema.extend({
    payload: intelliRecoverPayloadSchema.describe(
        'Intelli-recover setting (official IntelliRecoverSetting): autoFlag, firstRebootPoeInterval, rebootPoeInterval and limitNum.'
    ),
    dryRun: dryRunSchema,
});

type Client = Pick<OmadaClient, 'getIntelliRecoverSetting' | 'setIntelliRecoverSetting'>;

export function registerSetIntelliRecoverSettingTool(server: McpServer, client: Client): void {
    server.registerTool(
        'setIntelliRecoverSetting',
        {
            description:
                'Turn automatic intelli-recover on or off and set its intervals: unreachable monitored devices are recovered by cycling the PoE of their uplink switch port. Defaults to a preview of the current setting and differences; set dryRun:false to apply once and verify by readback.',
            inputSchema: inputSchema.shape,
            annotations: { destructiveHint: true },
        },
        wrapMutationToolHandler<typeof inputSchema.shape>(
            'setIntelliRecoverSetting',
            mutationSummary('set-intelli-recover-setting', (args) => args.siteId ?? 'default-site'),
            async ({ payload, siteId, customHeaders, dryRun }) =>
                await runSettings({
                    label: 'intelli-recover',
                    read: () => client.getIntelliRecoverSetting(siteId, customHeaders),
                    payload,
                    dryRun,
                    write: () => client.setIntelliRecoverSetting(payload, siteId, customHeaders),
                    warnings: [
                        'When enabled, the controller cycles PoE on uplink ports of unreachable monitored devices, which reboots anything powered by those ports.',
                    ],
                })
        )
    );
}
