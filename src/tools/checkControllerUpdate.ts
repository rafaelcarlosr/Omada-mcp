import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import type { OmadaClient } from '../omadaClient/index.js';
import { channelUpgrade21Schema } from '../omadaClient/requestSchemas.js';
import { wrapMutationToolHandler } from '../server/common.js';
import { dryRunSchema, mutationSummary, runAction } from './resourceMutationShared.js';
import { controllerInputSchema } from './siteAdminShared.js';

const inputSchema = controllerInputSchema.extend({
    payload: channelUpgrade21Schema.describe('Update channel (official Channel Upgrade): channel 0 stable, 1 release candidate, 2 beta.'),
    dryRun: dryRunSchema,
});

type Client = Pick<OmadaClient, 'checkControllerUpdate'>;

export function registerCheckControllerUpdateTool(server: McpServer, client: Client): void {
    server.registerTool(
        'checkControllerUpdate',
        {
            description:
                'Ask TP-Link whether a newer controller version exists on an update channel. It only checks; nothing is installed. Defaults to a preview; set dryRun:false to run the check.',
            inputSchema: inputSchema.shape,
            annotations: { destructiveHint: true },
        },
        wrapMutationToolHandler<typeof inputSchema.shape>(
            'checkControllerUpdate',
            mutationSummary('check-controller-update', () => 'controller'),
            async ({ payload, customHeaders, dryRun }) =>
                await runAction({
                    label: 'controller update check',
                    dryRun,
                    preflight: async () => ({ channel: payload.channel ?? 0 }),
                    write: () => client.checkControllerUpdate(payload, customHeaders),
                    warnings: ['The controller contacts the TP-Link update server.'],
                })
        )
    );
}
