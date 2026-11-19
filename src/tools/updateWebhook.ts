import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import { webhookUpdatePayloadSchema } from '../omadaClient/controllerSettings.js';
import type { OmadaClient } from '../omadaClient/index.js';
import { wrapMutationToolHandler } from '../server/common.js';
import { dryRunSchema, mutationSummary, runUpdate } from './resourceMutationShared.js';
import { controllerInputSchema } from './siteAdminShared.js';

const inputSchema = controllerInputSchema.extend({
    webhookId: z.string().trim().min(1).describe('Webhook ID (webhookId) from getWebhookForGlobal.'),
    payload: webhookUpdatePayloadSchema.describe(
        'Webhook change (official OpenApiWebhookSettingEditVO): urlList, retryPolicy, template and optional shardedSecret (kept when left out). The name cannot be changed.'
    ),
    dryRun: dryRunSchema,
});

type Client = Pick<OmadaClient, 'getWebhookForGlobal' | 'updateWebhook'>;

export function registerUpdateWebhookTool(server: McpServer, client: Client): void {
    server.registerTool(
        'updateWebhook',
        {
            description:
                'Change the URLs, retry policy, template or secret of a controller webhook. Defaults to a preview; set dryRun:false to apply once and verify by readback.',
            inputSchema: inputSchema.shape,
            annotations: { destructiveHint: true },
        },
        wrapMutationToolHandler<typeof inputSchema.shape>(
            'updateWebhook',
            mutationSummary('update-webhook', (args) => String(args.webhookId)),
            async ({ webhookId, payload, customHeaders, dryRun }) =>
                await runUpdate({
                    spec: { label: 'webhook', list: () => client.getWebhookForGlobal(customHeaders), idKeys: ['webhookId'], nameKey: null },
                    id: webhookId,
                    payload,
                    dryRun,
                    write: () => client.updateWebhook(webhookId, payload, customHeaders),
                })
        )
    );
}
