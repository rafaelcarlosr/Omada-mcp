import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import type { OmadaClient } from '../omadaClient/index.js';
import { wrapMutationToolHandler } from '../server/common.js';
import { dryRunSchema, mutationSummary, runDelete } from './resourceMutationShared.js';
import { controllerInputSchema } from './siteAdminShared.js';

const inputSchema = controllerInputSchema.extend({
    webhookId: z.string().trim().min(1).describe('Webhook ID (webhookId) from getWebhookForGlobal.'),
    dryRun: dryRunSchema,
});

type Client = Pick<OmadaClient, 'deleteWebhook' | 'getWebhookForGlobal'>;

export function registerDeleteWebhookTool(server: McpServer, client: Client): void {
    server.registerTool(
        'deleteWebhook',
        {
            description:
                'Delete a controller webhook; its URLs stop receiving events. Defaults to a preview; set dryRun:false to delete and verify it is gone.',
            inputSchema: inputSchema.shape,
            annotations: { destructiveHint: true },
        },
        wrapMutationToolHandler<typeof inputSchema.shape>(
            'deleteWebhook',
            mutationSummary('delete-webhook', (args) => String(args.webhookId)),
            async ({ webhookId, customHeaders, dryRun }) =>
                await runDelete({
                    spec: { label: 'webhook', list: () => client.getWebhookForGlobal(customHeaders), idKeys: ['webhookId'] },
                    id: webhookId,
                    dryRun,
                    write: () => client.deleteWebhook(webhookId, customHeaders),
                })
        )
    );
}
