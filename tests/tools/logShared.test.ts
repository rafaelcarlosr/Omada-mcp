import { describe, expect, it } from 'vitest';

import { applyChanges, auditBody, byKey, refuseUnknownKeys, requested } from '../../src/tools/logShared.js';

const settings = {
    webhookConfig: { webhookEnable: false },
    alertNotifications: [{ key: 'A', enable: true, email: true }],
    eventNotifications: [{ key: 'E', enable: true, email: false }],
};
const lists = ['alertNotifications', 'eventNotifications'] as const;

describe('tools/logShared', () => {
    it('applies changes by key and keeps everything else', () => {
        expect(applyChanges(settings, lists, [{ key: 'E', email: true, webhook: undefined }])).toEqual({
            ...settings,
            eventNotifications: [{ key: 'E', enable: true, email: true }],
        });
        expect(applyChanges({ alertNotifications: 'bad' }, lists, [{ key: 'A', enable: false }])).toEqual({ alertNotifications: 'bad' });
    });

    it('indexes entries and the requested changes by key', () => {
        expect(byKey(settings, lists)).toEqual({ A: settings.alertNotifications[0], E: settings.eventNotifications[0] });
        expect(requested([{ key: 'A', enable: false, email: undefined }], { webhookEnable: true })).toEqual({
            webhookConfig: { webhookEnable: true },
            entries: { A: { enable: false } },
        });
    });

    it('refuses unknown keys', () => {
        expect(() => refuseUnknownKeys(settings, lists, [{ key: 'Z' }])).toThrow('Unknown notification key(s): Z');
        expect(() => refuseUnknownKeys(settings, lists, [{ key: 'A' }])).not.toThrow();
    });

    it('builds the strict audit body', () => {
        expect(auditBody({ auditLogNotifications: [{ key: 'K', shortMsg: 'k', webhook: true }, { key: 'L' }] })).toEqual({
            webhookConfig: { webhookEnable: false },
            auditLogNotifications: [
                { key: 'K', webhook: true },
                { key: 'L', webhook: false },
            ],
        });
        expect(auditBody({ webhookConfig: { webhookEnable: true, webhookId: 'w' } })).toEqual({
            webhookConfig: { webhookEnable: true, webhookId: 'w' },
            auditLogNotifications: [],
        });
    });
});
