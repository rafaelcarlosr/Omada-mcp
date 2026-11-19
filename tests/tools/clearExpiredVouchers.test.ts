import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { OmadaClient } from '../../src/omadaClient/index.js';
import { OmadaApiError } from '../../src/omadaClient/request.js';
import { registerClearExpiredVouchersTool } from '../../src/tools/clearExpiredVouchers.js';

type Handler = (
    args: Record<string, unknown>,
    extra: object
) => Promise<{ structuredContent?: Record<string, unknown>; content: { text: string }[] }>;

describe('tools/clearExpiredVouchers', () => {
    let handler: Handler;
    let definition: { inputSchema: Record<string, { parse: (value: unknown) => unknown }> };
    let client: Record<string, ReturnType<typeof vi.fn>>;

    beforeEach(() => {
        client = {
            listVoucherGroups: vi.fn(async () => [
                { id: 'g-1', name: 'a', totalCount: 3, unusedCount: 1, usedCount: 2 },
                { id: 'g-2', name: 'b', totalCount: 1, unusedCount: 1, usedCount: 0 },
            ]),
            clearExpiredVouchers: vi.fn(async () => undefined),
            clearExpiredVouchersInGroups: vi.fn(async () => undefined),
        };
        const server = {
            registerTool: vi.fn((_name, def, fn) => {
                definition = def;
                handler = fn;
            }),
        } as unknown as McpServer;
        registerClearExpiredVouchersTool(server, client as unknown as OmadaClient);
    });

    it('previews the voucher counts of each group', async () => {
        const result = await handler({ groupIds: ['g-1', 'g-2'] }, {});
        expect(result.structuredContent).toMatchObject({
            status: 'planned',
            result: {
                target: {
                    groups: [
                        { id: 'g-1', totalCount: 3, usedCount: 2 },
                        { id: 'g-2', totalCount: 1, usedCount: 0 },
                    ],
                },
            },
        });
    });

    it('uses the single route for one group and the batch route for several', async () => {
        await handler({ groupIds: ['g-1'], dryRun: false }, {});
        expect(client.clearExpiredVouchers).toHaveBeenCalledWith('g-1', undefined, undefined);
        await handler({ groupIds: ['g-1', 'g-2'], dryRun: false }, {});
        expect(client.clearExpiredVouchersInGroups).toHaveBeenCalledWith(['g-1', 'g-2'], undefined, undefined);
    });

    it('refuses unknown groups and surfaces rejections', async () => {
        await expect(handler({ groupIds: ['g-9'], dryRun: false }, {})).rejects.toThrow('No voucher group with id g-9');
        expect(() => definition.inputSchema.groupIds.parse([])).toThrow();
        client.clearExpiredVouchers.mockRejectedValueOnce(new OmadaApiError(-1001, 'rejected'));
        await expect(handler({ groupIds: ['g-1'], dryRun: false }, {})).rejects.toThrow('(errorCode -1001): rejected');
    });
});
