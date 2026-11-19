import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import type { OmadaClient } from '../omadaClient/index.js';
import type { logNotificationBodySchema } from '../omadaClient/logAdmin.js';
import { siteInputSchema, wrapMutationToolHandler } from '../server/common.js';
import { applyChanges, byKey, logNotificationChangeSchema, refuseUnknownKeys, requested, webhookConfigChangeSchema } from './logShared.js';
import { dryRunSchema, mutationSummary, type RecordLike, runSettings } from './resourceMutationShared.js';

const LISTS = ['alertNotifications', 'eventNotifications'] as const;

const inputSchema = siteInputSchema.pick({ customHeaders: true }).extend({
    changes: z.array(logNotificationChangeSchema).min(1).max(200).describe('Entries to change, by key.'),
    webhookConfig: webhookConfigChangeSchema.optional().describe('Optional webhook switch for these notifications.'),
    dryRun: dryRunSchema,
});

type Client = Pick<OmadaClient, 'getLogSettingForGlobalV2' | 'setGlobalLogNotifications'>;

export function registerSetGlobalLogNotificationsTool(server: McpServer, client: Client): void {
    server.registerTool(
        'setGlobalLogNotifications',
        {
            description:
                'Change which global-level logs are recorded, emailed or sent to a webhook. Only the listed keys change; the controller accepts the settings only complete, so the tool sends every current entry with these changes applied. Defaults to a preview of the current entries and differences; set dryRun:false to apply once and verify by readback.',
            inputSchema: inputSchema.shape,
            annotations: { destructiveHint: true },
        },
        wrapMutationToolHandler<typeof inputSchema.shape>(
            'setGlobalLogNotifications',
            mutationSummary('set-global-log-notifications', () => 'global'),
            async ({ changes, webhookConfig, customHeaders, dryRun }) => {
                const read = async (): Promise<RecordLike> => ((await client.getLogSettingForGlobalV2(customHeaders)) ?? {}) as RecordLike;
                refuseUnknownKeys(await read(), LISTS, changes);
                return await runSettings({
                    label: 'global log notifications',
                    read: async () => {
                        const settings = await read();
                        return { ...(settings.webhookConfig ? { webhookConfig: settings.webhookConfig } : {}), entries: byKey(settings, LISTS) };
                    },
                    payload: requested(changes, webhookConfig),
                    dryRun,
                    write: async () =>
                        await client.setGlobalLogNotifications(
                            applyChanges(await read(), LISTS, changes, webhookConfig) as z.input<typeof logNotificationBodySchema>,
                            customHeaders
                        ),
                });
            }
        )
    );
}
