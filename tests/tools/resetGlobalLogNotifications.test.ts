import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { OmadaClient } from '../../src/omadaClient/index.js';
import { OmadaApiError } from '../../src/omadaClient/request.js';
import { registerResetGlobalLogNotificationsTool } from '../../src/tools/resetGlobalLogNotifications.js';

type Handler = (
    args: Record<string, unknown>,
    extra: object
) => Promise<{ structuredContent?: Record<string, unknown>; content: { text: string }[] }>;

describe('tools/resetGlobalLogNotifications', () => {
    let handler: Handler;
    let definition: { inputSchema: Record<string, { parse: (value: unknown) => unknown }> };
    let client: Record<string, ReturnType<typeof vi.fn>>;
    let state: Record<string, unknown>;

    beforeEach(() => {
        state = {};
        client = {
            getLogSettingForGlobalV2: vi.fn(async () => ({ webhookConfig: { webhookEnable: false } })),
            resetGlobalLogNotifications: vi.fn(async () => undefined),
        };
        const server = {
            registerTool: vi.fn((_name, def, fn) => {
                definition = def;
                handler = fn;
            }),
        } as unknown as McpServer;
        registerResetGlobalLogNotificationsTool(server, client as unknown as OmadaClient);
    });

    it('previews the current settings, then resets', async () => {
        expect((await handler({}, {})).structuredContent).toMatchObject({
            status: 'planned',
            result: { target: { current: { webhookConfig: {} } } },
        });
        await handler({ dryRun: false }, {});
        expect(client.resetGlobalLogNotifications).toHaveBeenCalledWith(undefined);
        expect(definition.inputSchema).toBeTruthy();
        expect(state).toEqual({});
    });

    it('surfaces rejections', async () => {
        client.resetGlobalLogNotifications.mockRejectedValueOnce(new OmadaApiError(-1001, 'rejected'));
        await expect(handler({ dryRun: false }, {})).rejects.toThrow('(errorCode -1001): rejected');
    });
});
