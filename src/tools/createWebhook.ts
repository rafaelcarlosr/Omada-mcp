import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import { webhookCreatePayloadSchema } from '../omadaClient/controllerSettings.js';
import type { OmadaClient } from '../omadaClient/index.js';
import { wrapMutationToolHandler } from '../server/common.js';
import { dryRunSchema, mutationSummary, runCreate } from './resourceMutationShared.js';
import { controllerInputSchema } from './siteAdminShared.js';

const inputSchema = controllerInputSchema.extend({
    payload: webhookCreatePayloadSchema.describe(
        'Webhook (official OpenApiWebhookSettingAddVO): name, urlList of 1-3 http(s) URLs, retryPolicy (0 none, 1 important: 5 retries over 60 min, 2 critical: 5 retries over 24 h), template (0 Omada, 1 Google Chat) and optional shardedSecret.'
    ),
    dryRun: dryRunSchema,
});

type Client = Pick<OmadaClient, 'createWebhook' | 'getWebhookForGlobal'>;

export function registerCreateWebhookTool(server: McpServer, client: Client): void {
    server.registerTool(
        'createWebhook',
        {
            description:
                'Create a controller webhook that posts controller events to up to three URLs. Defaults to a preview; set dryRun:false to create once and verify by readback.',
            inputSchema: inputSchema.shape,
            annotations: { destructiveHint: true },
        },
        wrapMutationToolHandler<typeof inputSchema.shape>(
            'createWebhook',
            mutationSummary('create-webhook', (args) => String((args.payload as { name?: unknown }).name)),
            async ({ payload, customHeaders, dryRun }) =>
                await runCreate({
                    spec: { label: 'webhook', list: () => client.getWebhookForGlobal(customHeaders), idKeys: ['webhookId'] },
                    payload,
                    dryRun,
                    write: () => client.createWebhook(payload, customHeaders),
                    warnings: ['Controller events, which can include device, client and user names, are sent to these URLs.'],
                })
        )
    );
}
