import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { OmadaClient } from '../../src/omadaClient/index.js';
import { OmadaApiError } from '../../src/omadaClient/request.js';
import { registerSetIotRadioSettingTool } from '../../src/tools/setIotRadioSetting.js';

type Handler = (
    args: Record<string, unknown>,
    extra: object
) => Promise<{ structuredContent?: Record<string, unknown>; content: { text: string }[] }>;

describe('tools/setIotRadioSetting', () => {
    let handler: Handler;
    let definition: { inputSchema: Record<string, { parse: (value: unknown) => unknown }> };
    let client: Record<string, ReturnType<typeof vi.fn>>;
    let state: Record<string, unknown>;

    beforeEach(() => {
        state = { enable: true, consoleMode: 0, passcode: '123456', transmitPower: 0, agingTime: 30, format: 0, resource: 0 };
        client = {
            getIotRadioSetting: vi.fn(async () => state),
            setIotRadioSetting: vi.fn((body: Record<string, unknown>) => {
                state = { ...state, ...body };
                return Promise.resolve(undefined);
            }),
        };
        const server = {
            registerTool: vi.fn((_name, def, fn) => {
                definition = def;
                handler = fn;
            }),
        } as unknown as McpServer;
        registerSetIotRadioSettingTool(server, client as unknown as OmadaClient);
    });

    it('accepts partial payloads and validates fields', () => {
        expect(definition.inputSchema.payload.parse({ agingTime: 60 })).toEqual({ agingTime: 60 });
        expect(() => definition.inputSchema.payload.parse({ passcode: '12' })).toThrow();
        expect(() => definition.inputSchema.payload.parse({ resource: 1 })).toThrow();
    });

    it('previews without writing', async () => {
        const result = await handler({ payload: { agingTime: 60 } }, {});
        expect(client.setIotRadioSetting).not.toHaveBeenCalled();
        expect(result.structuredContent).toMatchObject({ status: 'planned', result: { alreadyMatches: false } });
    });

    it('sends the change merged over the current setting and verifies it', async () => {
        const result = await handler({ payload: { agingTime: 60 }, siteId: 'site-1', dryRun: false }, {});
        expect(client.setIotRadioSetting).toHaveBeenCalledWith(
            { enable: true, consoleMode: 0, passcode: '123456', transmitPower: 0, agingTime: 60, format: 0 },
            'site-1',
            undefined
        );
        expect(result.structuredContent).toMatchObject({ status: 'verified' });
    });

    it('surfaces controller rejections', async () => {
        client.setIotRadioSetting.mockRejectedValueOnce(new OmadaApiError(-1001, 'rejected'));
        await expect(handler({ payload: { enable: false }, dryRun: false }, {})).rejects.toThrow('(errorCode -1001): rejected');
    });
});
