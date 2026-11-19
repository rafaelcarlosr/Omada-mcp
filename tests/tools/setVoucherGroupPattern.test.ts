import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { OmadaClient } from '../../src/omadaClient/index.js';
import { OmadaApiError } from '../../src/omadaClient/request.js';
import { registerSetVoucherGroupPatternTool } from '../../src/tools/setVoucherGroupPattern.js';

type Handler = (
    args: Record<string, unknown>,
    extra: object
) => Promise<{ structuredContent?: Record<string, unknown>; content: { text: string }[] }>;

describe('tools/setVoucherGroupPattern', () => {
    let handler: Handler;
    let definition: { inputSchema: Record<string, { parse: (value: unknown) => unknown }> };
    let client: Record<string, ReturnType<typeof vi.fn>>;
    let pattern: Record<string, unknown>;

    beforeEach(() => {
        pattern = { patternType: 2, position: 2, durationEnable: true, limitEnable: true };
        client = {
            getVoucherGroupDetail: vi.fn(async () => ({ id: 'g-1', voucherPattern: pattern })),
            setVoucherGroupPattern: vi.fn((_group: string, body: Record<string, unknown>) => {
                const { printComments: _comments, ssidNetworkenable: _ssid, ...kept } = body;
                pattern = { ...pattern, ...kept };
                return Promise.resolve(undefined);
            }),
        };
        const server = {
            registerTool: vi.fn((_name, def, fn) => {
                definition = def;
                handler = fn;
            }),
        } as unknown as McpServer;
        registerSetVoucherGroupPatternTool(server, client as unknown as OmadaClient);
    });

    const payload = { patternType: 1, position: 0, title: 'Guest', titleSize: 14, limitEnable: false, printComments: 'Enjoy' };

    it('validates the pattern', () => {
        expect(() => definition.inputSchema.payload.parse({ titleSize: 30 })).toThrow();
        expect(() => definition.inputSchema.groupId.parse('')).toThrow();
    });

    it('previews, then applies and verifies the readable fields', async () => {
        expect((await handler({ groupId: 'g-1', payload }, {})).structuredContent).toMatchObject({ status: 'planned' });
        const result = await handler({ groupId: 'g-1', payload, dryRun: false }, {});
        expect(client.setVoucherGroupPattern).toHaveBeenCalledWith('g-1', payload, undefined, undefined);
        expect(result.structuredContent).toMatchObject({ status: 'verified', result: { notVerifiedFields: ['printComments'] } });
    });

    it('surfaces controller rejections', async () => {
        client.setVoucherGroupPattern.mockRejectedValueOnce(new OmadaApiError(-1001, 'rejected'));
        await expect(handler({ groupId: 'g-1', payload, dryRun: false }, {})).rejects.toThrow('(errorCode -1001): rejected');
    });
});
