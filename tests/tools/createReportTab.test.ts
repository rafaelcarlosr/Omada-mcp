import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { OmadaClient } from '../../src/omadaClient/index.js';
import { OmadaApiError } from '../../src/omadaClient/request.js';
import { registerCreateReportTabTool } from '../../src/tools/createReportTab.js';

type Handler = (
    args: Record<string, unknown>,
    extra: object
) => Promise<{ structuredContent?: Record<string, unknown>; content: { text: string }[] }>;

describe('tools/createReportTab', () => {
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
        registerCreateReportTabTool(server, client as unknown as OmadaClient);
    });

    it('previews, then creates once and verifies by readback', async () => {
        const payload = { name: 'Ops', status: 1, cardGroupList: [{ cardGroupName: 'traffic', cardList: ['internet', 'network'] }] };
        expect((await handler({ payload }, {})).structuredContent).toMatchObject({ status: 'planned' });
        const result = await handler({ payload, dryRun: false }, {});
        expect(client.createReportTab).toHaveBeenCalledWith(payload, undefined, undefined);
        expect(result.structuredContent).toMatchObject({ status: 'verified', result: { createdId: 't-3' } });
    });

    it('refuses duplicate names and invalid card groups', async () => {
        await expect(
            handler(
                {
                    payload: {
                        ...{ name: 'Ops', status: 1, cardGroupList: [{ cardGroupName: 'traffic', cardList: ['internet', 'network'] }] },
                        name: 'Mine',
                    },
                    dryRun: false,
                },
                {}
            )
        ).rejects.toThrow('already exists');
        expect(() => definition.inputSchema.payload.parse({ name: 'x', cardGroupList: [] })).toThrow();
        client.listReportTabs.mockResolvedValueOnce(undefined);
        client.createReportTab.mockRejectedValueOnce(new OmadaApiError(-1, 'General error.'));
        await expect(
            handler(
                {
                    payload: { name: 'Ops', status: 1, cardGroupList: [{ cardGroupName: 'traffic', cardList: ['internet', 'network'] }] },
                    dryRun: false,
                },
                {}
            )
        ).rejects.toThrow('(errorCode -1)');
    });
});
