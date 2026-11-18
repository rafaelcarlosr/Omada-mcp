import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { OmadaClient } from '../../src/omadaClient/index.js';
import { OmadaApiError } from '../../src/omadaClient/request.js';
import { registerSetEoGreTunnelConfigTool } from '../../src/tools/setEoGreTunnelConfig.js';

type Handler = (
    args: Record<string, unknown>,
    extra: object
) => Promise<{ structuredContent?: Record<string, unknown>; content: { text: string }[] }>;

const before = { greEnable: false };
const payload = { greEnable: true, tunnelMtu: 1400, interval: 30, maxCount: 5, primaryAddress: '203.0.113.1' };

describe('tools/setEoGreTunnelConfig', () => {
    let state: Record<string, unknown>;
    let handler: Handler;
    let definition: { inputSchema: Record<string, { parse: (value: unknown) => unknown }> };
    let client: Record<string, ReturnType<typeof vi.fn>>;

    beforeEach(() => {
        state = before;
        client = {
            getEoGreTunnelConfig: vi.fn(async () => state),
            setEoGreTunnelConfig: vi.fn((body: Record<string, unknown>) => {
                state = body;
                return Promise.resolve({});
            }),
        };
        const server = {
            registerTool: vi.fn((_name, def, fn) => {
                definition = def;
                handler = fn;
            }),
        } as unknown as McpServer;
        registerSetEoGreTunnelConfigTool(server, client as unknown as OmadaClient);
    });

    it('validates the documented payload and MTU range', () => {
        expect(() => definition.inputSchema.payload.parse({ ...payload, unexpected: true })).toThrow();
        expect(() => definition.inputSchema.payload.parse({ ...payload, tunnelMtu: 600 })).toThrow();
        expect(() => definition.inputSchema.payload.parse({ greEnable: false })).toThrow();
        expect(definition.inputSchema.payload.parse(payload)).toEqual(payload);
    });

    it('previews the difference without writing', async () => {
        const result = await handler({ payload }, {});
        expect(client.setEoGreTunnelConfig).not.toHaveBeenCalled();
        expect(result.structuredContent).toMatchObject({ status: 'planned', result: { before, alreadyMatches: false } });
    });

    it('applies once and verifies the readback', async () => {
        const result = await handler({ payload, siteId: 'site-1', dryRun: false }, {});
        expect(client.setEoGreTunnelConfig).toHaveBeenCalledTimes(1);
        expect(client.setEoGreTunnelConfig).toHaveBeenCalledWith(payload, 'site-1', undefined);
        expect(client.getEoGreTunnelConfig).toHaveBeenCalledWith('site-1', undefined);
        expect(result.structuredContent).toMatchObject({ status: 'verified' });
    });

    it('surfaces controller rejections', async () => {
        client.setEoGreTunnelConfig.mockRejectedValueOnce(new OmadaApiError(-1001, 'Parameter [tunnelMtu] should not be null'));
        await expect(handler({ payload, dryRun: false }, {})).rejects.toThrow('(errorCode -1001)');
    });
});
