import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { OmadaClient } from '../../src/omadaClient/index.js';
import { OmadaApiError } from '../../src/omadaClient/request.js';
import { registerDeleteSiteAlertLogsTool } from '../../src/tools/deleteSiteAlertLogs.js';

type Handler = (
    args: Record<string, unknown>,
    extra: object
) => Promise<{ structuredContent?: Record<string, unknown>; content: { text: string }[] }>;

describe('tools/deleteSiteAlertLogs', () => {
    let handler: Handler;
    let definition: { inputSchema: Record<string, { parse: (value: unknown) => unknown }> };
    let client: Record<string, ReturnType<typeof vi.fn>>;
    let state: Record<string, unknown>;

    beforeEach(() => {
        state = { logs: [{ id: 'l-1' }, { id: 'l-2' }] };
        client = {
            listSiteAlerts: vi.fn(async () => ({ data: state.logs })),
            deleteSiteAlertLogs: vi.fn((selection: { logIds: string[] }) => {
                state = { logs: (state.logs as { id: string }[]).filter((log) => !selection.logIds.includes(log.id)) };
                return Promise.resolve(undefined);
            }),
        };
        const server = {
            registerTool: vi.fn((_name, def, fn) => {
                definition = def;
                handler = fn;
            }),
        } as unknown as McpServer;
        registerDeleteSiteAlertLogsTool(server, client as unknown as OmadaClient);
    });

    it('previews, then deletes only the listed logs and verifies they are gone', async () => {
        expect((await handler({ logIds: ['l-1'], startTime: 1, endTime: 2 }, {})).structuredContent).toMatchObject({
            status: 'planned',
            result: { ids: ['l-1'] },
        });
        const result = await handler({ logIds: ['l-1'], startTime: 1, endTime: 2, siteId: 's-1', dryRun: false }, {});
        expect(client.deleteSiteAlertLogs).toHaveBeenCalledWith({ logIds: ['l-1'], startTime: 1, endTime: 2 }, 's-1', undefined);
        expect(client.listSiteAlerts).toHaveBeenCalledWith({ page: 1, pageSize: 1000, startTime: 1, endTime: 2 }, 's-1', undefined);
        expect(result.structuredContent).toMatchObject({ status: 'verified' });
    });

    it('refuses unknown logs, empty lists and reversed periods', async () => {
        await expect(handler({ logIds: ['l-9'], startTime: 1, endTime: 2, dryRun: false }, {})).rejects.toThrow('No alert log with id "l-9"');
        await expect(handler({ logIds: ['l-1'], startTime: 2, endTime: 1 }, {})).rejects.toThrow('startTime must be before endTime.');
        expect(() => definition.inputSchema.logIds.parse([])).toThrow();
        client.listSiteAlerts.mockResolvedValueOnce(undefined);
        await expect(handler({ logIds: ['l-1'], startTime: 1, endTime: 2 }, {})).rejects.toThrow('No');
        expect(client.deleteSiteAlertLogs).not.toHaveBeenCalled();
    });

    it('surfaces rejections', async () => {
        client.deleteSiteAlertLogs.mockRejectedValueOnce(new OmadaApiError(-1001, 'rejected'));
        await expect(handler({ logIds: ['l-1'], startTime: 1, endTime: 2, dryRun: false }, {})).rejects.toThrow('(errorCode -1001): rejected');
    });
});
