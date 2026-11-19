import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import type { OmadaClient } from '../omadaClient/index.js';
import { siteInputSchema, wrapMutationToolHandler } from '../server/common.js';
import { dryRunSchema, mutationSummary, runAction } from './resourceMutationShared.js';

const inputSchema = siteInputSchema.extend({ dryRun: dryRunSchema });

type Client = Pick<OmadaClient, 'getLogSettingForSiteV2' | 'resetSiteLogNotifications'>;

export function registerResetSiteLogNotificationsTool(server: McpServer, client: Client): void {
    server.registerTool(
        'resetSiteLogNotifications',
        {
            description:
                'Reset every site log notification (record, email, webhook per log) to the controller defaults. Defaults to a preview with the current settings; set dryRun:false to reset.',
            inputSchema: inputSchema.shape,
            annotations: { destructiveHint: true },
        },
        wrapMutationToolHandler<typeof inputSchema.shape>(
            'resetSiteLogNotifications',
            mutationSummary('reset-site-log-notifications', () => 'site'),
            async ({ siteId, customHeaders, dryRun }) =>
                await runAction({
                    label: 'site log notification reset',
                    dryRun,
                    preflight: async () => ({ current: await client.getLogSettingForSiteV2(siteId, customHeaders) }),
                    write: () => client.resetSiteLogNotifications(siteId, customHeaders),
                    warnings: ['Every customized site log notification returns to its default.'],
                })
        )
    );
}
