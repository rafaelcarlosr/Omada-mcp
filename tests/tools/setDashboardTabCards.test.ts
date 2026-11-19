import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { OmadaClient } from '../../src/omadaClient/index.js';
import { OmadaApiError } from '../../src/omadaClient/request.js';
import { registerSetDashboardTabCardsTool } from '../../src/tools/setDashboardTabCards.js';

type Handler = (
    args: Record<string, unknown>,
    extra: object
) => Promise<{ structuredContent?: Record<string, unknown>; content: { text: string }[] }>;

describe('tools/setDashboardTabCards', () => {
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
        registerSetDashboardTabCardsTool(server, client as unknown as OmadaClient);
    });

    it('sends every current tab and changes only the target, so no tab is deleted', async () => {
        const result = await handler({ tabId: 'c', cards: [101, 105], dryRun: false }, {});
        expect(client.setDashboardTabs).toHaveBeenCalledWith(
            {
                tabs: [
                    { id: 'o', cards: [101] },
                    { id: 'n', cards: [104] },
                    { id: 'c', cards: [101, 105] },
                ],
            },
            undefined,
            undefined
        );
        expect(tabs).toHaveLength(3);
        expect(result.structuredContent).toMatchObject({ status: 'verified' });
    });

    it('previews, keeps tabs without cards, and refuses unknown tabs', async () => {
        expect((await handler({ tabId: 'c', cards: [101] }, {})).structuredContent).toMatchObject({
            status: 'planned',
            result: { alreadyMatches: false },
        });
        tabs = [{ id: 'c', name: 'Mine', type: 3 }];
        await handler({ tabId: 'c', cards: [101], dryRun: false }, {});
        expect(client.setDashboardTabs).toHaveBeenLastCalledWith({ tabs: [{ id: 'c', cards: [101] }] }, undefined, undefined);
        await expect(handler({ tabId: 'zz', cards: [101], dryRun: false }, {})).rejects.toThrow('No dashboard tab with id "zz"');
    });

    it('validates the cards and surfaces rejections', async () => {
        expect(() => definition.inputSchema.cards.parse([-1])).toThrow();
        client.setDashboardTabs.mockRejectedValueOnce(new OmadaApiError(-1001, 'rejected'));
        await expect(handler({ tabId: 'c', cards: [101], dryRun: false }, {})).rejects.toThrow('(errorCode -1001): rejected');
    });
});
