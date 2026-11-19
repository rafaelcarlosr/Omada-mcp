import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { OmadaClient } from '../../src/omadaClient/index.js';
import { OmadaApiError } from '../../src/omadaClient/request.js';
import { registerSetClientDetailInformationTool } from '../../src/tools/setClientDetailInformation.js';

type Handler = (
    args: Record<string, unknown>,
    extra: object
) => Promise<{ structuredContent?: Record<string, unknown>; content: { text: string }[] }>;

const payload = { clientRecognitionEnable: true, clientHealthEnable: false, clientHistoryEnable: false, clientDataTrendEnable: false };

describe('tools/setClientDetailInformation', () => {
    let handler: Handler;
    let definition: { inputSchema: Record<string, { parse: (value: unknown) => unknown }> };
    let client: Record<string, ReturnType<typeof vi.fn>>;
    let state: Record<string, unknown>;

    beforeEach(() => {
        state = { clientRecognitionEnable: true, clientHealthEnable: true, clientHistoryEnable: false, clientDataTrendEnable: false };
        client = {
            getClientDetailInformation: vi.fn(async () => ({ switches: state, durations: {} })),
            setClientDetailInformation: vi.fn((body: Record<string, unknown>) => {
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
        registerSetClientDetailInformationTool(server, client as unknown as OmadaClient);
    });

    it('validates the documented payload and takes no site', () => {
        expect(() => definition.inputSchema.payload.parse({ ...payload, unexpected: true })).toThrow();
        expect(definition.inputSchema.payload.parse(payload)).toEqual(payload);
        expect(definition.inputSchema.siteId).toBeUndefined();
    });

    it('previews the differences without writing', async () => {
        const result = await handler({ payload }, {});
        expect(client.setClientDetailInformation).not.toHaveBeenCalled();
        expect(result.structuredContent).toMatchObject({ status: 'planned', result: { dryRun: true, alreadyMatches: false } });
    });

    it('applies once and verifies the readback', async () => {
        const result = await handler({ payload, dryRun: false }, {});
        expect(client.setClientDetailInformation).toHaveBeenCalledWith(payload, undefined);
        expect(result.structuredContent).toMatchObject({ status: 'verified', result: { noOp: false } });
    });

    it('skips the write when the setting already matches', async () => {
        state = { ...state, ...payload };
        const result = await handler({ payload, dryRun: false }, {});
        expect(client.setClientDetailInformation).not.toHaveBeenCalled();
        expect(result.structuredContent).toMatchObject({ result: { noOp: true } });
    });

    it('surfaces controller rejections', async () => {
        client.setClientDetailInformation.mockRejectedValueOnce(new OmadaApiError(-1001, 'rejected'));
        await expect(handler({ payload, dryRun: false }, {})).rejects.toThrow('(errorCode -1001): rejected');
    });
});
