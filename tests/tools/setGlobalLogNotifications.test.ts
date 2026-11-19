import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { OmadaClient } from '../../src/omadaClient/index.js';
import { OmadaApiError } from '../../src/omadaClient/request.js';
import { registerSetGlobalLogNotificationsTool } from '../../src/tools/setGlobalLogNotifications.js';

type Handler = (
    args: Record<string, unknown>,
    extra: object
) => Promise<{ structuredContent?: Record<string, unknown>; content: { text: string }[] }>;

describe('tools/setGlobalLogNotifications', () => {
    let handler: Handler;
    let definition: { inputSchema: Record<string, { parse: (value: unknown) => unknown }> };
    let client: Record<string, ReturnType<typeof vi.fn>>;
    let state: Record<string, unknown>;

    beforeEach(() => {
        state = {
            webhookConfig: { webhookEnable: false },
            alertNotifications: [{ key: 'NODE_DISCONNECT', shortMsg: 'Node was disconnected', enable: true, email: true, webhook: false }],
            eventNotifications: [{ key: 'AUTO_BK_OK', shortMsg: 'Backup done', enable: true, email: false, webhook: false }],
        };
        client = {
            getLogSettingForGlobalV2: vi.fn(async () => state),
            setGlobalLogNotifications: vi.fn((body: Record<string, unknown>) => {
                state = body;
                return Promise.resolve(undefined);
            }),
        };
        const server = {
            registerTool: vi.fn((_name, def, fn) => {
                definition = def;
                handler = fn;
            }),
        } as unknown as McpServer;
        registerSetGlobalLogNotificationsTool(server, client as unknown as OmadaClient);
    });

    it('validates the changes', () => {
        expect(() => definition.inputSchema.changes.parse([{ key: 'X' }])).toThrow('Change at least one');
        expect(() => definition.inputSchema.webhookConfig.parse({ webhookEnable: true })).toThrow('webhookId is required');
    });

    it('previews, then sends every entry exactly as read with only the change applied', async () => {
        expect((await handler({ changes: [{ key: 'NODE_DISCONNECT', email: false }] }, {})).structuredContent).toMatchObject({ status: 'planned' });
        const result = await handler({ changes: [{ key: 'NODE_DISCONNECT', email: false }], dryRun: false }, {});
        expect(client.setGlobalLogNotifications).toHaveBeenCalledWith(
            {
                webhookConfig: { webhookEnable: false },
                alertNotifications: [{ key: 'NODE_DISCONNECT', shortMsg: 'Node was disconnected', enable: true, email: false, webhook: false }],
                eventNotifications: [{ key: 'AUTO_BK_OK', shortMsg: 'Backup done', enable: true, email: false, webhook: false }],
            },
            undefined
        );
        expect(result.structuredContent).toMatchObject({ status: 'verified' });
    });

    it('applies a webhook switch and skips writes that already match', async () => {
        await handler(
            { changes: [{ key: 'AUTO_BK_OK', webhook: true }], webhookConfig: { webhookEnable: true, webhookId: 'w-1' }, dryRun: false },
            {}
        );
        expect(state.webhookConfig).toEqual({ webhookEnable: true, webhookId: 'w-1' });
        const again = await handler({ changes: [{ key: 'AUTO_BK_OK', webhook: true }], dryRun: false }, {});
        expect(again.structuredContent).toMatchObject({ result: { noOp: true } });
    });

    it('refuses unknown keys and surfaces rejections', async () => {
        await expect(handler({ changes: [{ key: 'NOPE', enable: false }], dryRun: false }, {})).rejects.toThrow('Unknown notification key(s): NOPE');
        client.getLogSettingForGlobalV2.mockResolvedValueOnce(undefined);
        await expect(handler({ changes: [{ key: 'NODE_DISCONNECT', enable: false }] }, {})).rejects.toThrow('Unknown notification key');
        client.setGlobalLogNotifications.mockRejectedValueOnce(new OmadaApiError(-1001, 'Invalid request parameters.'));
        await expect(handler({ changes: [{ key: 'NODE_DISCONNECT', enable: false }], dryRun: false }, {})).rejects.toThrow('(errorCode -1001)');
    });
});
