import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { OmadaClient } from '../../src/omadaClient/index.js';
import { OmadaApiError } from '../../src/omadaClient/request.js';
import { registerSetAnomalyNotificationTool } from '../../src/tools/setAnomalyNotification.js';

type Handler = (
    args: Record<string, unknown>,
    extra: object
) => Promise<{ structuredContent?: Record<string, unknown>; content: { text: string }[] }>;

describe('tools/setAnomalyNotification', () => {
    let handler: Handler;
    let definition: { inputSchema: Record<string, { parse: (value: unknown) => unknown }> };
    let client: Record<string, ReturnType<typeof vi.fn>>;
    let state: Record<string, unknown>[];

    beforeEach(() => {
        state = [
            {
                alertEmailSetting: { alertEmailEnable: false, delayEnable: true, delay: 60 },
                email: { eventLevel: { critical: true, info: false }, eventObjectType: { ap: true }, eventCategory: { roaming: true } },
            },
        ];
        client = {
            getAnomalyNotificationSetting: vi.fn(async () => state[0]),
            setAnomalyNotification: vi.fn((body: Record<string, unknown>) => {
                state = [body];
                return Promise.resolve(undefined);
            }),
        };
        const server = {
            registerTool: vi.fn((_name, def, fn) => {
                definition = def;
                handler = fn;
            }),
        } as unknown as McpServer;
        registerSetAnomalyNotificationTool(server, client as unknown as OmadaClient);
    });

    it('merges the change over the complete current setting', async () => {
        const result = await handler({ delay: 120, eventLevel: { info: true }, siteId: 's-1', dryRun: false }, {});
        expect(client.setAnomalyNotification).toHaveBeenCalledWith(
            {
                alertEmailSetting: { delayEnable: true, delay: 120 },
                email: { eventLevel: { critical: true, info: true }, eventObjectType: { ap: true }, eventCategory: { roaming: true } },
            },
            's-1',
            undefined
        );
        expect(result.structuredContent).toMatchObject({ status: 'verified' });
    });

    it('previews, handles an empty current setting and refuses empty changes', async () => {
        expect((await handler({ eventCategory: { roaming: false } }, {})).structuredContent).toMatchObject({ status: 'planned' });
        client.getAnomalyNotificationSetting.mockResolvedValue(undefined);
        await handler({ delayEnable: false, dryRun: false }, {});
        expect(client.setAnomalyNotification).toHaveBeenLastCalledWith(
            { alertEmailSetting: { delayEnable: false }, email: { eventLevel: {}, eventObjectType: {}, eventCategory: {} } },
            undefined,
            undefined
        );
        await expect(handler({ dryRun: false }, {})).rejects.toThrow('Send at least one change.');
        expect(definition.inputSchema.delay).toBeTruthy();
    });

    it('surfaces rejections', async () => {
        client.setAnomalyNotification.mockRejectedValueOnce(new OmadaApiError(-1, 'General error.'));
        await expect(handler({ delay: 90, dryRun: false }, {})).rejects.toThrow('(errorCode -1)');
    });
});
