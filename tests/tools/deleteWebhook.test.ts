import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { OmadaClient } from '../../src/omadaClient/index.js';
import { OmadaApiError } from '../../src/omadaClient/request.js';
import { registerDeleteWebhookTool } from '../../src/tools/deleteWebhook.js';

type Handler = (
    args: Record<string, unknown>,
    extra: object
) => Promise<{ structuredContent?: Record<string, unknown>; content: { text: string }[] }>;

describe('tools/deleteWebhook', () => {
    let handler: Handler;
    let definition: { inputSchema: Record<string, { parse: (value: unknown) => unknown }> };
    let client: Record<string, ReturnType<typeof vi.fn>>;
    let hooks: Record<string, unknown>[];

    beforeEach(() => {
        hooks = [{ webhookId: 'w-1', name: 'ops', urlList: ['https://example.com/a'], retryPolicy: 0, template: 0, shardedSecret: 'old' }];
        client = {
            getWebhookForGlobal: vi.fn(async () => hooks),
            createWebhook: vi.fn((body: Record<string, unknown>) => {
                hooks = [...hooks, { ...body, webhookId: 'w-2' }];
                return Promise.resolve(undefined);
            }),
            updateWebhook: vi.fn((id: string, body: Record<string, unknown>) => {
                hooks = hooks.map((hook) => (hook.webhookId === id ? { ...hook, ...body } : hook));
                return Promise.resolve(undefined);
            }),
            deleteWebhook: vi.fn((id: string) => {
                hooks = hooks.filter((hook) => hook.webhookId !== id);
                return Promise.resolve(undefined);
            }),
            testWebhook: vi.fn(async () => ({ logMessages: [{ url: 'https://example.com/a', status: 0, messageCode: 200 }] })),
        };
        const server = {
            registerTool: vi.fn((_name, def, fn) => {
                definition = def;
                handler = fn;
            }),
        } as unknown as McpServer;
        registerDeleteWebhookTool(server, client as unknown as OmadaClient);
    });

    it('previews, then deletes once and verifies it is gone', async () => {
        expect((await handler({ webhookId: 'w-1' }, {})).structuredContent).toMatchObject({ status: 'planned' });
        const result = await handler({ webhookId: 'w-1', dryRun: false }, {});
        expect(client.deleteWebhook).toHaveBeenCalledWith('w-1', undefined);
        expect(result.structuredContent).toMatchObject({ status: 'verified' });
    });

    it('refuses unknown webhooks and surfaces rejections', async () => {
        expect(() => definition.inputSchema.webhookId.parse('')).toThrow();
        await expect(handler({ webhookId: 'nope', dryRun: false }, {})).rejects.toThrow('No webhook with id "nope"');
        client.deleteWebhook.mockRejectedValueOnce(new OmadaApiError(-1001, 'rejected'));
        await expect(handler({ webhookId: 'w-1', dryRun: false }, {})).rejects.toThrow('(errorCode -1001): rejected');
    });
});
