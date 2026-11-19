import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { OmadaClient } from '../../src/omadaClient/index.js';
import { OmadaApiError } from '../../src/omadaClient/request.js';
import { registerDeleteReportTabsTool } from '../../src/tools/deleteReportTabs.js';

type Handler = (
    args: Record<string, unknown>,
    extra: object
) => Promise<{ structuredContent?: Record<string, unknown>; content: { text: string }[] }>;

describe('tools/deleteReportTabs', () => {
    let handler: Handler;
    let definition: { inputSchema: Record<string, { parse: (value: unknown) => unknown }> };
    let client: Record<string, ReturnType<typeof vi.fn>>;
    let state: Record<string, unknown>[];

    beforeEach(() => {
        state = [
            { tabId: 't-1', name: 'Summary', type: 0, status: 1, cardGroupList: [] },
            { tabId: 't-2', name: 'Mine', type: 1, status: 1, cardGroupList: [{ cardGroupName: 'traffic', cardList: ['internet'] }] },
        ];
        client = {
            listReportTabs: vi.fn(async () => ({ tabsLimited: false, reportTabVOs: state })),
            createReportTab: vi.fn((body: Record<string, unknown>) => {
                state = [...state, { ...body, tabId: 't-3', type: 1 }];
                return Promise.resolve(undefined);
            }),
            updateReportTab: vi.fn((id: string, body: Record<string, unknown>) => {
                state = state.map((tab) => (tab.tabId === id ? { ...tab, ...body } : tab));
                return Promise.resolve(undefined);
            }),
            deleteReportTabs: vi.fn((ids: string[]) => {
                state = state.filter((tab) => !ids.includes(String(tab.tabId)));
                return Promise.resolve(undefined);
            }),
        };
        const server = {
            registerTool: vi.fn((_name, def, fn) => {
                definition = def;
                handler = fn;
            }),
        } as unknown as McpServer;
        registerDeleteReportTabsTool(server, client as unknown as OmadaClient);
    });

    it('previews, then deletes custom tabs and verifies they are gone', async () => {
        expect((await handler({ tabIds: ['t-2'] }, {})).structuredContent).toMatchObject({ status: 'planned' });
        const result = await handler({ tabIds: ['t-2'], dryRun: false }, {});
        expect(client.deleteReportTabs).toHaveBeenCalledWith(['t-2'], undefined, undefined);
        expect(result.structuredContent).toMatchObject({ status: 'verified' });
    });

    it('refuses built-in and unknown tabs', async () => {
        await expect(handler({ tabIds: ['t-1'], dryRun: false }, {})).rejects.toThrow('built-in report tab');
        await expect(handler({ tabIds: ['nope'], dryRun: false }, {})).rejects.toThrow('No report tab with id "nope"');
        expect(() => definition.inputSchema.tabIds.parse([])).toThrow();
        client.deleteReportTabs.mockRejectedValueOnce(new OmadaApiError(-1, 'rejected'));
        await expect(handler({ tabIds: ['t-2'], dryRun: false }, {})).rejects.toThrow('(errorCode -1)');
    });
});
