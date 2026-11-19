import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { OmadaClient } from '../../src/omadaClient/index.js';
import { OmadaApiError } from '../../src/omadaClient/request.js';
import { registerDeleteVoucherGroupsTool } from '../../src/tools/deleteVoucherGroups.js';

type Handler = (
    args: Record<string, unknown>,
    extra: object
) => Promise<{ structuredContent?: Record<string, unknown>; content: { text: string }[] }>;

describe('tools/deleteVoucherGroups', () => {
    let handler: Handler;
    let definition: { inputSchema: Record<string, { parse: (value: unknown) => unknown }> };
    let client: Record<string, ReturnType<typeof vi.fn>>;
    let groups: Record<string, unknown>[];

    beforeEach(() => {
        groups = [
            { id: 'g-1', name: 'a' },
            { id: 'g-2', name: 'b' },
        ];
        client = {
            listVoucherGroups: vi.fn(async () => groups),
            deleteVoucherGroups: vi.fn((ids: string[]) => {
                groups = groups.filter((group) => !ids.includes(String(group.id)));
                return Promise.resolve(undefined);
            }),
        };
        const server = {
            registerTool: vi.fn((_name, def, fn) => {
                definition = def;
                handler = fn;
            }),
        } as unknown as McpServer;
        registerDeleteVoucherGroupsTool(server, client as unknown as OmadaClient);
    });

    it('previews, then deletes the listed groups and verifies they are gone', async () => {
        expect((await handler({ groupIds: ['g-1'] }, {})).structuredContent).toMatchObject({ status: 'planned' });
        const result = await handler({ groupIds: ['g-1', 'g-2'], dryRun: false }, {});
        expect(client.deleteVoucherGroups).toHaveBeenCalledWith(['g-1', 'g-2'], undefined, undefined);
        expect(result.structuredContent).toMatchObject({ status: 'verified' });
    });

    it('refuses unknown groups and surfaces rejections', async () => {
        await expect(handler({ groupIds: ['g-9'], dryRun: false }, {})).rejects.toThrow('No voucher group with id "g-9"');
        expect(() => definition.inputSchema.groupIds.parse([])).toThrow();
        client.deleteVoucherGroups.mockRejectedValueOnce(new OmadaApiError(-1001, 'rejected'));
        await expect(handler({ groupIds: ['g-1'], dryRun: false }, {})).rejects.toThrow('(errorCode -1001): rejected');
    });
});
