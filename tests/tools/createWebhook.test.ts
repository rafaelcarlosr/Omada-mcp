import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { OmadaClient } from '../../src/omadaClient/index.js';
import { OmadaApiError } from '../../src/omadaClient/request.js';
import { registerCreateWebhookTool } from '../../src/tools/createWebhook.js';

type Handler = (
    args: Record<string, unknown>,
    extra: object
) => Promise<{ structuredContent?: Record<string, unknown>; content: { text: string }[] }>;

describe('tools/createWebhook', () => {
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
        registerCreateWebhookTool(server, client as unknown as OmadaClient);
    });

    const payload = { name: 'alerts', urlList: ['https://example.com/hook'], retryPolicy: 1, template: 0, shardedSecret: 'abc' };

    it('validates URLs and fields', () => {
        expect(() => definition.inputSchema.payload.parse({ ...payload, urlList: ['ftp://x'] })).toThrow();
        expect(() =>
            definition.inputSchema.payload.parse({
                ...payload,
                urlList: ['https://a.example', 'https://b.example', 'https://c.example', 'https://d.example'],
            })
        ).toThrow();
        expect(() => definition.inputSchema.payload.parse({ ...payload, unexpected: 1 })).toThrow();
    });

    it('previews, then creates once and verifies by readback', async () => {
        expect((await handler({ payload }, {})).structuredContent).toMatchObject({ status: 'planned', result: { warnings: [expect.any(String)] } });
        const result = await handler({ payload, dryRun: false }, {});
        expect(client.createWebhook).toHaveBeenCalledWith(payload, undefined);
        expect(result.structuredContent).toMatchObject({ status: 'verified', result: { createdId: 'w-2' } });
    });

    it('refuses a duplicate name and surfaces rejections', async () => {
        await expect(handler({ payload: { ...payload, name: 'ops' }, dryRun: false }, {})).rejects.toThrow('already exists');
        client.createWebhook.mockRejectedValueOnce(new OmadaApiError(-1001, 'rejected'));
        await expect(handler({ payload, dryRun: false }, {})).rejects.toThrow('(errorCode -1001): rejected');
    });
});
