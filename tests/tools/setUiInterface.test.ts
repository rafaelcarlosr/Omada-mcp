import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { OmadaClient } from '../../src/omadaClient/index.js';
import { OmadaApiError } from '../../src/omadaClient/request.js';
import { registerSetUiInterfaceTool } from '../../src/tools/setUiInterface.js';

type Handler = (
    args: Record<string, unknown>,
    extra: object
) => Promise<{ structuredContent?: Record<string, unknown>; content: { text: string }[] }>;

describe('tools/setUiInterface', () => {
    let handler: Handler;
    let definition: { inputSchema: Record<string, { parse: (value: unknown) => unknown }> };
    let client: Record<string, ReturnType<typeof vi.fn>>;
    let state: Record<string, unknown>;

    beforeEach(() => {
        state = { timeZone: 0, refreshRate: 2, privateLabelingEnable: false };
        client = {
            getUiInterface: vi.fn(async () => state),
            setUiInterface: vi.fn((body: Record<string, unknown>) => {
                state = { ...body };
                return Promise.resolve(undefined);
            }),
        };
        const server = {
            registerTool: vi.fn((_name, def, fn) => {
                definition = def;
                handler = fn;
            }),
        } as unknown as McpServer;
        registerSetUiInterfaceTool(server, client as unknown as OmadaClient);
    });

    it('accepts partial changes but not empty or Pro-only fields', () => {
        expect(definition.inputSchema.payload.parse({ refreshRate: 3 })).toEqual({ refreshRate: 3 });
        expect(() => definition.inputSchema.payload.parse({})).toThrow('Send at least one');
        expect(() => definition.inputSchema.payload.parse({ privateLabelingEnable: true })).toThrow();
    });

    it('sends the change with the current values so nothing is reset', async () => {
        const result = await handler({ payload: { refreshRate: 3 }, dryRun: false }, {});
        expect(client.setUiInterface).toHaveBeenCalledWith({ timeZone: 0, refreshRate: 3, privateLabelingEnable: false }, undefined);
        expect(result.structuredContent).toMatchObject({ status: 'verified' });
    });

    it('fills the refresh rate when the current setting has none', async () => {
        state = {};
        await handler({ payload: { timeZone: 3 }, dryRun: false }, {});
        expect(client.setUiInterface).toHaveBeenCalledWith({ refreshRate: 2, timeZone: 3 }, undefined);
    });

    it('previews without writing and surfaces rejections', async () => {
        expect((await handler({ payload: { refreshRate: 3 } }, {})).structuredContent).toMatchObject({ status: 'planned' });
        expect(client.setUiInterface).not.toHaveBeenCalled();
        client.setUiInterface.mockRejectedValueOnce(new OmadaApiError(-1001, 'rejected'));
        await expect(handler({ payload: { refreshRate: 3 }, dryRun: false }, {})).rejects.toThrow('(errorCode -1001): rejected');
    });
});
