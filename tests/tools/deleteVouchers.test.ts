import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { OmadaClient } from '../../src/omadaClient/index.js';
import { OmadaApiError } from '../../src/omadaClient/request.js';
import { registerDeleteVouchersTool } from '../../src/tools/deleteVouchers.js';

type Handler = (
    args: Record<string, unknown>,
    extra: object
) => Promise<{ structuredContent?: Record<string, unknown>; content: { text: string }[] }>;

describe('tools/deleteVouchers', () => {
    let handler: Handler;
    let definition: { inputSchema: Record<string, { parse: (value: unknown) => unknown }> };
    let client: Record<string, ReturnType<typeof vi.fn>>;
    let vouchers: Record<string, unknown>[];

    beforeEach(() => {
        vouchers = [
            { id: 'v-1', code: '111111' },
            { id: 'v-2', code: '222222' },
            { id: 'v-3', code: '333333' },
        ];
        const remove = (ids: string[]) => {
            vouchers = vouchers.filter((voucher) => !ids.includes(String(voucher.id)));
            return Promise.resolve(undefined);
        };
        client = {
            getVoucherGroupDetail: vi.fn(async () => ({ id: 'g-1', data: vouchers })),
            deleteVoucher: vi.fn((id: string) => remove([id])),
            deleteVouchers: vi.fn((_group: string, ids: string[]) => remove(ids)),
        };
        const server = {
            registerTool: vi.fn((_name, def, fn) => {
                definition = def;
                handler = fn;
            }),
        } as unknown as McpServer;
        registerDeleteVouchersTool(server, client as unknown as OmadaClient);
    });

    it('previews the selected vouchers without deleting', async () => {
        const result = await handler({ groupId: 'g-1', voucherIds: ['v-1'] }, {});
        expect(client.deleteVoucher).not.toHaveBeenCalled();
        expect(result.structuredContent).toMatchObject({ status: 'planned', result: { ids: ['v-1'], before: [{ code: '111111' }] } });
    });

    it('uses the single route for one voucher and the batch route for several', async () => {
        await handler({ groupId: 'g-1', voucherIds: ['v-1'], siteId: 's-1', dryRun: false }, {});
        expect(client.deleteVoucher).toHaveBeenCalledWith('v-1', 's-1', undefined);
        const result = await handler({ groupId: 'g-1', voucherIds: ['v-2', 'v-3'], dryRun: false }, {});
        expect(client.deleteVouchers).toHaveBeenCalledWith('g-1', ['v-2', 'v-3'], undefined, undefined);
        expect(result.structuredContent).toMatchObject({ status: 'verified' });
        expect(client.getVoucherGroupDetail).toHaveBeenCalledWith('g-1', { page: 1, pageSize: 1000 }, undefined, undefined);
    });

    it('refuses vouchers outside the group and empty lists', async () => {
        await expect(handler({ groupId: 'g-1', voucherIds: ['v-9'], dryRun: false }, {})).rejects.toThrow('No voucher with id "v-9"');
        expect(() => definition.inputSchema.voucherIds.parse([])).toThrow();
        client.getVoucherGroupDetail.mockResolvedValueOnce(undefined);
        await expect(handler({ groupId: 'g-1', voucherIds: ['v-1'] }, {})).rejects.toThrow('No voucher with id');
    });

    it('surfaces controller rejections', async () => {
        client.deleteVouchers.mockRejectedValueOnce(new OmadaApiError(-1001, 'rejected'));
        await expect(handler({ groupId: 'g-1', voucherIds: ['v-1', 'v-2'], dryRun: false }, {})).rejects.toThrow('(errorCode -1001): rejected');
    });
});
