import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { OmadaClient } from '../../src/omadaClient/index.js';
import { OmadaApiError } from '../../src/omadaClient/request.js';
import { registerSetSiteAuditNotificationsTool } from '../../src/tools/setSiteAuditNotifications.js';

type Handler = (
    args: Record<string, unknown>,
    extra: object
) => Promise<{ structuredContent?: Record<string, unknown>; content: { text: string }[] }>;

describe('tools/setSiteAuditNotifications', () => {
    let handler: Handler;
    let definition: { inputSchema: Record<string, { parse: (value: unknown) => unknown }> };
    let client: Record<string, ReturnType<typeof vi.fn>>;
    let state: Record<string, unknown>;

    beforeEach(() => {
        state = {
            webhookConfig: { webhookEnable: false },
            auditLogNotifications: [
                { key: 'ACCOUNT', shortMsg: 'Account', webhook: false },
                { key: 'BACKUP', shortMsg: 'Backup', webhook: false },
            ],
        };
        client = {
            getAuditLogSettingForSite: vi.fn(async () => state),
            setSiteAuditNotifications: vi.fn((body: { auditLogNotifications: Record<string, unknown>[]; webhookConfig: Record<string, unknown> }) => {
                state = {
                    webhookConfig: body.webhookConfig,
                    auditLogNotifications: body.auditLogNotifications.map((entry) => ({ ...entry, shortMsg: String(entry.key) })),
                };
                return Promise.resolve(undefined);
            }),
        };
        const server = {
            registerTool: vi.fn((_name, def, fn) => {
                definition = def;
                handler = fn;
            }),
        } as unknown as McpServer;
        registerSetSiteAuditNotificationsTool(server, client as unknown as OmadaClient);
    });

    it('previews, then sends only key and webhook for every category', async () => {
        expect((await handler({ changes: [{ key: 'ACCOUNT', webhook: true }] }, {})).structuredContent).toMatchObject({ status: 'planned' });
        const result = await handler({ changes: [{ key: 'ACCOUNT', webhook: true }], siteId: 's-1', dryRun: false }, {});
        expect(client.setSiteAuditNotifications).toHaveBeenCalledWith(
            {
                webhookConfig: { webhookEnable: false },
                auditLogNotifications: [
                    { key: 'ACCOUNT', webhook: true },
                    { key: 'BACKUP', webhook: false },
                ],
            },
            's-1',
            undefined
        );
        expect(result.structuredContent).toMatchObject({ status: 'verified' });
    });

    it('keeps a webhook ID and refuses unknown keys', async () => {
        await handler({ changes: [{ key: 'BACKUP', webhook: true }], webhookConfig: { webhookEnable: true, webhookId: 'w-1' }, dryRun: false }, {});
        expect(state.webhookConfig).toEqual({ webhookEnable: true, webhookId: 'w-1' });
        await expect(handler({ changes: [{ key: 'NOPE', webhook: true }], dryRun: false }, {})).rejects.toThrow('Unknown notification key(s): NOPE');
        expect(() => definition.inputSchema.changes.parse([{ key: 'ACCOUNT' }])).toThrow();
    });

    it('surfaces rejections', async () => {
        state = {};
        client.getAuditLogSettingForSite.mockResolvedValueOnce({ auditLogNotifications: [{ key: 'ACCOUNT', webhook: false }] });
        client.getAuditLogSettingForSite.mockResolvedValueOnce({ auditLogNotifications: [{ key: 'ACCOUNT', webhook: false }] });
        client.getAuditLogSettingForSite.mockResolvedValueOnce({ auditLogNotifications: [{ key: 'ACCOUNT', webhook: false }] });
        client.setSiteAuditNotifications.mockRejectedValueOnce(new OmadaApiError(-1001, 'rejected'));
        await expect(handler({ changes: [{ key: 'ACCOUNT', webhook: true }], dryRun: false }, {})).rejects.toThrow('(errorCode -1001): rejected');
    });
});
