import { z } from 'zod';

import type { auditLogNotificationSettingEditOpenApiVOSchema } from '../omadaClient/requestSchemas.js';
import type { RecordLike } from './resourceMutationShared.js';

export const logNotificationChangeSchema = z
    .object({
        key: z.string().trim().min(1).describe('Notification key from the current settings, e.g. NODE_DISCONNECT.'),
        enable: z.boolean().optional().describe('Record this log.'),
        email: z.boolean().optional().describe('Send an email for this log.'),
        webhook: z.boolean().optional().describe('Send this log to the configured webhook.'),
    })
    .strict()
    .refine(
        (value) => value.enable !== undefined || value.email !== undefined || value.webhook !== undefined,
        'Change at least one of enable, email or webhook.'
    );

export const auditNotificationChangeSchema = z
    .object({
        key: z.string().trim().min(1).describe('Audit category key from the current settings, e.g. ACCOUNT.'),
        webhook: z.boolean().describe('Send this audit category to the configured webhook.'),
    })
    .strict();

export const webhookConfigChangeSchema = z
    .object({
        webhookEnable: z.boolean().describe('Send notifications to a webhook.'),
        webhookId: z.string().trim().min(1).optional().describe('Webhook ID (webhookId) from getWebhookForGlobal, required when enabling.'),
    })
    .strict()
    .refine((value) => !value.webhookEnable || value.webhookId !== undefined, 'webhookId is required when webhookEnable is true.');

type Change = { key: string } & Record<string, unknown>;

function lists(settings: RecordLike, listKeys: readonly string[]): RecordLike[] {
    return listKeys.flatMap((listKey) => (Array.isArray(settings[listKey]) ? (settings[listKey] as RecordLike[]) : []));
}

/** Refuses keys the controller does not list, before anything is sent. */
export function refuseUnknownKeys(settings: RecordLike, listKeys: readonly string[], changes: readonly Change[]): void {
    const known = new Set(lists(settings, listKeys).map((entry) => entry.key));
    const unknown = changes.map((change) => change.key).filter((key) => !known.has(key));
    if (unknown.length)
        throw new Error(`Unknown notification key(s): ${unknown.join(', ')}. Read the current settings for valid keys. No request was sent.`);
}

/** The settings object with the changes applied in place, keeping every other field (the controller needs them all). */
export function applyChanges(settings: RecordLike, listKeys: readonly string[], changes: readonly Change[], webhookConfig?: RecordLike): RecordLike {
    const byKey = new Map(changes.map((change) => [change.key, change]));
    const next: RecordLike = { ...settings, ...(webhookConfig ? { webhookConfig } : {}) };
    for (const listKey of listKeys) {
        if (!Array.isArray(settings[listKey])) continue;
        next[listKey] = (settings[listKey] as RecordLike[]).map((entry) => {
            const change = byKey.get(String(entry.key));
            if (!change) return entry;
            const { key: _key, ...fields } = change;
            return { ...entry, ...Object.fromEntries(Object.entries(fields).filter(([, value]) => value !== undefined)) };
        });
    }
    return next;
}

/** Notification entries keyed by their key, for readback comparison. */
export function byKey(settings: RecordLike, listKeys: readonly string[]): RecordLike {
    return Object.fromEntries(lists(settings, listKeys).map((entry) => [String(entry.key), entry]));
}

/** The comparable shape of the requested changes. */
export function requested(changes: readonly Change[], webhookConfig?: RecordLike): RecordLike {
    return {
        ...(webhookConfig ? { webhookConfig } : {}),
        entries: Object.fromEntries(
            changes.map(({ key, ...fields }) => [key, Object.fromEntries(Object.entries(fields).filter(([, value]) => value !== undefined))])
        ),
    };
}

/** The audit route takes only key and webhook per category, and the webhook switch. */
export function auditBody(settings: RecordLike): z.input<typeof auditLogNotificationSettingEditOpenApiVOSchema> {
    const webhook = (settings.webhookConfig ?? {}) as RecordLike;
    const entries = Array.isArray(settings.auditLogNotifications) ? (settings.auditLogNotifications as RecordLike[]) : [];
    return {
        webhookConfig: {
            webhookEnable: webhook.webhookEnable === true,
            ...(typeof webhook.webhookId === 'string' ? { webhookId: webhook.webhookId } : {}),
        },
        auditLogNotifications: entries.map((entry) => ({ key: String(entry.key), webhook: entry.webhook === true })),
    };
}
