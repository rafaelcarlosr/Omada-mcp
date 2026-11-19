import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { OmadaClient } from '../../src/omadaClient/index.js';
import { OmadaApiError } from '../../src/omadaClient/request.js';
import { registerUpdateReportTabTool } from '../../src/tools/updateReportTab.js';

type Handler = (
    args: Record<string, unknown>,
    extra: object
) => Promise<{ structuredContent?: Record<string, unknown>; content: { text: string }[] }>;

describe('tools/updateReportTab', () => {
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
        registerUpdateReportTabTool(server, client as unknown as OmadaClient);
    });

    it('previews, then replaces a custom tab and verifies by readback', async () => {
        const payload = { name: 'Ops', status: 1, cardGroupList: [{ cardGroupName: 'traffic', cardList: ['internet', 'network'] }] };
        expect((await handler({ tabId: 't-2', payload }, {})).structuredContent).toMatchObject({ status: 'planned' });
        const result = await handler({ tabId: 't-2', payload, dryRun: false }, {});
        expect(client.updateReportTab).toHaveBeenCalledWith('t-2', payload, undefined, undefined);
        expect(result.structuredContent).toMatchObject({ status: 'verified' });
    });

    it('refuses built-in and unknown tabs', async () => {
        await expect(
            handler(
                {
                    tabId: 't-1',
                    payload: { name: 'Ops', status: 1, cardGroupList: [{ cardGroupName: 'traffic', cardList: ['internet', 'network'] }] },
                    dryRun: false,
                },
                {}
            )
        ).rejects.toThrow('built-in report tab');
        await expect(
            handler(
                {
                    tabId: 'nope',
                    payload: { name: 'Ops', status: 1, cardGroupList: [{ cardGroupName: 'traffic', cardList: ['internet', 'network'] }] },
                    dryRun: false,
                },
                {}
            )
        ).rejects.toThrow('No report tab with id "nope"');
        expect(client.updateReportTab).not.toHaveBeenCalled();
        client.updateReportTab.mockRejectedValueOnce(new OmadaApiError(-30210, 'rejected'));
        await expect(
            handler(
                {
                    tabId: 't-2',
                    payload: { name: 'Ops', status: 1, cardGroupList: [{ cardGroupName: 'traffic', cardList: ['internet', 'network'] }] },
                    dryRun: false,
                },
                {}
            )
        ).rejects.toThrow('(errorCode -30210)');
        expect(definition.inputSchema.tabId).toBeTruthy();
    });
});
