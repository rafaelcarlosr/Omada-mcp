import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { OmadaClient } from '../../src/omadaClient/index.js';
import { OmadaApiError } from '../../src/omadaClient/request.js';
import { registerSetVoucherCurrencyTool } from '../../src/tools/setVoucherCurrency.js';

type Handler = (
    args: Record<string, unknown>,
    extra: object
) => Promise<{ structuredContent?: Record<string, unknown>; content: { text: string }[] }>;

describe('tools/setVoucherCurrency', () => {
    let handler: Handler;
    let definition: { inputSchema: Record<string, { parse: (value: unknown) => unknown }> };
    let client: Record<string, ReturnType<typeof vi.fn>>;
    let currency: string | undefined;

    beforeEach(() => {
        currency = undefined;
        client = {
            getVoucherSummary: vi.fn(async () => ({ current: { count: 1, ...(currency ? { currency } : {}) } })),
            setVoucherCurrency: vi.fn((value: string) => {
                currency = value;
                return Promise.resolve(undefined);
            }),
        };
        const server = {
            registerTool: vi.fn((_name, def, fn) => {
                definition = def;
                handler = fn;
            }),
        } as unknown as McpServer;
        registerSetVoucherCurrencyTool(server, client as unknown as OmadaClient);
    });

    it('validates the currency code', () => {
        expect(() => definition.inputSchema.currency.parse('brl')).toThrow();
    });

    it('previews, then sets the currency and verifies it in the voucher summary', async () => {
        expect((await handler({ currency: 'BRL' }, {})).structuredContent).toMatchObject({ status: 'planned', result: { before: {} } });
        const result = await handler({ currency: 'BRL', dryRun: false }, {});
        expect(client.setVoucherCurrency).toHaveBeenCalledWith('BRL', undefined, undefined);
        expect(result.structuredContent).toMatchObject({ status: 'verified' });
        expect((await handler({ currency: 'BRL', dryRun: false }, {})).structuredContent).toMatchObject({ result: { noOp: true } });
    });

    it('surfaces controller rejections', async () => {
        client.getVoucherSummary.mockResolvedValueOnce(undefined);
        client.setVoucherCurrency.mockRejectedValueOnce(new OmadaApiError(-1001, 'rejected'));
        await expect(handler({ currency: 'USD', dryRun: false }, {})).rejects.toThrow('(errorCode -1001): rejected');
    });
});
