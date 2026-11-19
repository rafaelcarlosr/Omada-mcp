import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import { webhookTestPayloadSchema } from '../omadaClient/controllerSettings.js';
import type { OmadaClient } from '../omadaClient/index.js';
import { wrapMutationToolHandler } from '../server/common.js';
import { dryRunSchema, findRecord, mutationSummary, runAction, toRecords } from './resourceMutationShared.js';
import { controllerInputSchema } from './siteAdminShared.js';

const inputSchema = controllerInputSchema.extend({
    webhookId: z.string().trim().min(1).describe('Webhook ID (webhookId) from getWebhookForGlobal.'),
    payload: webhookTestPayloadSchema.describe(
        'Test target (official OpenApiWebhookSettingTestVO): name, urlList of 1-3 http(s) URLs, template and optional shardedSecret.'
    ),
    dryRun: dryRunSchema,
});

type Client = Pick<OmadaClient, 'getWebhookForGlobal' | 'testWebhook'>;

export function registerTestWebhookTool(server: McpServer, client: Client): void {
    server.registerTool(
        'testWebhook',
        {
            description:
                'Send a test event from the controller to webhook URLs and return the delivery status of each URL. Defaults to a preview; set dryRun:false to send.',
            inputSchema: inputSchema.shape,
            annotations: { destructiveHint: true },
        },
        wrapMutationToolHandler<typeof inputSchema.shape>(
            'testWebhook',
            mutationSummary('test-webhook', (args) => String(args.webhookId)),
            async ({ webhookId, payload, customHeaders, dryRun }) =>
                await runAction({
                    label: 'webhook test',
                    dryRun,
                    preflight: async () => {
                        const webhook = findRecord(toRecords(await client.getWebhookForGlobal(customHeaders)), webhookId, ['webhookId']);
                        if (!webhook) throw new Error(`No webhook with id "${webhookId}" exists. List them again to get a current id.`);
                        return { webhookId, name: webhook.name, urlList: payload.urlList };
                    },
                    write: () => client.testWebhook(webhookId, payload, customHeaders),
                    warnings: ['The controller sends a test event to these URLs.'],
                })
        )
    );
}
