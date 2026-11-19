import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import type { OmadaClient } from '../omadaClient/index.js';
import { siteInputSchema, wrapMutationToolHandler } from '../server/common.js';
import { dryRunSchema, mutationSummary, runAction } from './resourceMutationShared.js';

const inputSchema = siteInputSchema.pick({ customHeaders: true }).extend({ dryRun: dryRunSchema });

type Client = Pick<OmadaClient, 'getLogSettingForGlobalV2' | 'resetGlobalLogNotifications'>;

export function registerResetGlobalLogNotificationsTool(server: McpServer, client: Client): void {
    server.registerTool(
        'resetGlobalLogNotifications',
        {
            description:
                'Reset every global log notification (record, email, webhook per log) to the controller defaults. Defaults to a preview with the current settings; set dryRun:false to reset.',
            inputSchema: inputSchema.shape,
            annotations: { destructiveHint: true },
        },
        wrapMutationToolHandler<typeof inputSchema.shape>(
            'resetGlobalLogNotifications',
            mutationSummary('reset-global-log-notifications', () => 'global'),
            async ({ customHeaders, dryRun }) =>
                await runAction({
                    label: 'global log notification reset',
                    dryRun,
                    preflight: async () => ({ current: await client.getLogSettingForGlobalV2(customHeaders) }),
                    write: () => client.resetGlobalLogNotifications(customHeaders),
                    warnings: ['Every customized global log notification returns to its default.'],
                })
        )
    );
}
