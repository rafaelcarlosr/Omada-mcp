import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import type { OmadaClient } from '../omadaClient/index.js';
import { siteInputSchema, wrapMutationToolHandler } from '../server/common.js';
import {
    applyChanges,
    auditBody,
    auditNotificationChangeSchema,
    byKey,
    refuseUnknownKeys,
    requested,
    webhookConfigChangeSchema,
} from './logShared.js';
import { dryRunSchema, mutationSummary, type RecordLike, runSettings } from './resourceMutationShared.js';

const LISTS = ['auditLogNotifications'] as const;

const inputSchema = siteInputSchema.pick({ customHeaders: true }).extend({
    changes: z.array(auditNotificationChangeSchema).min(1).max(200).describe('Entries to change, by key.'),
    webhookConfig: webhookConfigChangeSchema.optional().describe('Optional webhook switch for these notifications.'),
    dryRun: dryRunSchema,
});

type Client = Pick<OmadaClient, 'getAuditLogSettingForGlobal' | 'setGlobalAuditNotifications'>;

export function registerSetGlobalAuditNotificationsTool(server: McpServer, client: Client): void {
    server.registerTool(
        'setGlobalAuditNotifications',
        {
            description:
                'Change which global-level audit log categories are sent to a webhook. Only the listed keys change; every other category is sent unchanged. Defaults to a preview of the current entries and differences; set dryRun:false to apply once and verify by readback.',
            inputSchema: inputSchema.shape,
            annotations: { destructiveHint: true },
        },
        wrapMutationToolHandler<typeof inputSchema.shape>(
            'setGlobalAuditNotifications',
            mutationSummary('set-global-audit-notifications', () => 'global'),
            async ({ changes, webhookConfig, customHeaders, dryRun }) => {
                const read = async (): Promise<RecordLike> => ((await client.getAuditLogSettingForGlobal(customHeaders)) ?? {}) as RecordLike;
                refuseUnknownKeys(await read(), LISTS, changes);
                return await runSettings({
                    label: 'global audit notifications',
                    read: async () => {
                        const settings = await read();
                        return { ...(settings.webhookConfig ? { webhookConfig: settings.webhookConfig } : {}), entries: byKey(settings, LISTS) };
                    },
                    payload: requested(changes, webhookConfig),
                    dryRun,
                    write: async () =>
                        await client.setGlobalAuditNotifications(auditBody(applyChanges(await read(), LISTS, changes, webhookConfig)), customHeaders),
                });
            }
        )
    );
}
