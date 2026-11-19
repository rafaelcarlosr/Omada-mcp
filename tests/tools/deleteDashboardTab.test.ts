import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { OmadaClient } from '../../src/omadaClient/index.js';
import { OmadaApiError } from '../../src/omadaClient/request.js';
import { registerDeleteDashboardTabTool } from '../../src/tools/deleteDashboardTab.js';

type Handler = (
    args: Record<string, unknown>,
    extra: object
) => Promise<{ structuredContent?: Record<string, unknown>; content: { text: string }[] }>;

describe('tools/deleteDashboardTab', () => {
    let handler: Handler;
    let definition: { inputSchema: Record<string, { parse: (value: unknown) => unknown }> };
    let client: Record<string, ReturnType<typeof vi.fn>>;
    let tabs: Record<string, unknown>[];

    beforeEach(() => {
        tabs = [
            { id: 'o', name: 'Overall', type: 0, cards: [101] },
            { id: 'n', name: 'Network', type: 1, cards: [104] },
            { id: 'c', name: 'Mine', type: 3, cards: [] },
        ];
        client = {
            listDashboardTabs: vi.fn(async () => tabs),
            createDashboardTab: vi.fn((name: string) => {
                tabs = [...tabs, { id: 'new', name, type: 3, cards: [] }];
                return Promise.resolve(undefined);
            }),
            updateDashboardTab: vi.fn((id: string, body: { name?: string }) => {
                tabs = tabs.map((tab) => (tab.id === id && body.name ? { ...tab, name: body.name } : tab));
                return Promise.resolve(undefined);
            }),
            deleteDashboardTab: vi.fn((id: string) => {
                tabs = tabs.filter((tab) => tab.id !== id);
                return Promise.resolve(undefined);
            }),
            setDashboardTabs: vi.fn((body: { tabs: { id: string; cards: number[] }[] }) => {
                tabs = tabs
                    .filter((tab) => body.tabs.some((sent) => sent.id === tab.id))
                    .map((tab) => ({ ...tab, cards: body.tabs.find((sent) => sent.id === tab.id)?.cards }));
                return Promise.resolve(undefined);
            }),
        };
        const server = {
            registerTool: vi.fn((_name, def, fn) => {
                definition = def;
                handler = fn;
            }),
        } as unknown as McpServer;
        registerDeleteDashboardTabTool(server, client as unknown as OmadaClient);
    });

    it('previews with a warning, then deletes and verifies it is gone', async () => {
        expect((await handler({ tabId: 'c' }, {})).structuredContent).toMatchObject({
            status: 'planned',
            result: { warnings: [expect.any(String)] },
        });
        const result = await handler({ tabId: 'c', dryRun: false }, {});
        expect(client.deleteDashboardTab).toHaveBeenCalledWith('c', undefined, undefined);
        expect(result.structuredContent).toMatchObject({ status: 'verified' });
    });

    it('refuses the Overall tab and unknown tabs', async () => {
        await expect(handler({ tabId: 'o', dryRun: false }, {})).rejects.toThrow('Overall tab cannot be deleted');
        await expect(handler({ tabId: 'zz', dryRun: false }, {})).rejects.toThrow('No dashboard tab with id "zz"');
        expect(client.deleteDashboardTab).not.toHaveBeenCalled();
        client.deleteDashboardTab.mockRejectedValueOnce(new OmadaApiError(-1001, 'rejected'));
        await expect(handler({ tabId: 'c', dryRun: false }, {})).rejects.toThrow('(errorCode -1001): rejected');
        expect(definition.inputSchema.tabId).toBeTruthy();
    });
});
