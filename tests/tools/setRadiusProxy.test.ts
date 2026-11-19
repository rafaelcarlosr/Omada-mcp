import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { OmadaClient } from '../../src/omadaClient/index.js';
import { OmadaApiError } from '../../src/omadaClient/request.js';
import { registerSetRadiusProxyTool } from '../../src/tools/setRadiusProxy.js';

type Handler = (
    args: Record<string, unknown>,
    extra: object
) => Promise<{ structuredContent?: Record<string, unknown>; content: { text: string }[] }>;

const payload = { enable: true, port: 1812, requireMessageAuthenticator: false };

describe('tools/setRadiusProxy', () => {
    let handler: Handler;
    let definition: { inputSchema: Record<string, { parse: (value: unknown) => unknown }> };
    let client: Record<string, ReturnType<typeof vi.fn>>;
    let state: Record<string, unknown>;

    beforeEach(() => {
        state = { enable: false, port: 1812 };
        client = {
            getRadiusProxyConfig: vi.fn(async () => state),
            setRadiusProxy: vi.fn((body: Record<string, unknown>) => {
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
        registerSetRadiusProxyTool(server, client as unknown as OmadaClient);
    });

    it('validates the documented payload and takes no site', () => {
        expect(() => definition.inputSchema.payload.parse({ ...payload, unexpected: true })).toThrow();
        expect(definition.inputSchema.payload.parse(payload)).toEqual(payload);
        expect(definition.inputSchema.siteId).toBeUndefined();
    });

    it('previews the differences without writing', async () => {
        const result = await handler({ payload }, {});
        expect(client.setRadiusProxy).not.toHaveBeenCalled();
        expect(result.structuredContent).toMatchObject({ status: 'planned', result: { dryRun: true, alreadyMatches: false } });
    });

    it('applies once and verifies the readback', async () => {
        const result = await handler({ payload, dryRun: false }, {});
        expect(client.setRadiusProxy).toHaveBeenCalledWith(payload, undefined);
        expect(result.structuredContent).toMatchObject({ status: 'verified', result: { noOp: false } });
    });

    it('skips the write when the setting already matches', async () => {
        state = { ...state, ...payload };
        const result = await handler({ payload, dryRun: false }, {});
        expect(client.setRadiusProxy).not.toHaveBeenCalled();
        expect(result.structuredContent).toMatchObject({ result: { noOp: true } });
    });

    it('reports the port as unverified while the proxy is off', async () => {
        state = { enable: true, port: 1812, requireMessageAuthenticator: true };
        const result = await handler({ payload: { enable: false, port: 1813 }, dryRun: false }, {});
        expect(result.structuredContent).toMatchObject({ result: { notVerifiedFields: ['port'] } });
        expect(() => definition.inputSchema.payload.parse({ enable: false, port: 1812, limitProxyState: true })).toThrow(
            'kept only while enable is true'
        );
    });

    it('surfaces controller rejections', async () => {
        client.setRadiusProxy.mockRejectedValueOnce(new OmadaApiError(-1001, 'rejected'));
        await expect(handler({ payload, dryRun: false }, {})).rejects.toThrow('(errorCode -1001): rejected');
    });
});
