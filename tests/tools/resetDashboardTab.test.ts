import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { OmadaClient } from '../../src/omadaClient/index.js';
import { OmadaApiError } from '../../src/omadaClient/request.js';
import { registerResetDashboardTabTool } from '../../src/tools/resetDashboardTab.js';

type Handler = (
    args: Record<string, unknown>,
    extra: object
) => Promise<{ structuredContent?: Record<string, unknown>; content: { text: string }[] }>;

describe('tools/resetDashboardTab', () => {
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
        registerResetDashboardTabTool(server, client as unknown as OmadaClient);
    });

    it('previews, then resets a built-in tab', async () => {
        expect((await handler({ tabId: 'n' }, {})).structuredContent).toMatchObject({
            status: 'planned',
            result: { target: { tab: { name: 'Network' } } },
        });
        await handler({ tabId: 'n', dryRun: false }, {});
        expect(client.updateDashboardTab).toHaveBeenCalledWith('n', { reset: true }, undefined, undefined);
    });

    it('refuses custom and unknown tabs', async () => {
        await expect(handler({ tabId: 'c', dryRun: false }, {})).rejects.toThrow('custom tab');
        await expect(handler({ tabId: 'zz', dryRun: false }, {})).rejects.toThrow('No dashboard tab with id "zz"');
        expect(client.updateDashboardTab).not.toHaveBeenCalled();
        client.updateDashboardTab.mockRejectedValueOnce(new OmadaApiError(-34701, 'missing'));
        await expect(handler({ tabId: 'n', dryRun: false }, {})).rejects.toThrow('(errorCode -34701)');
        expect(definition.inputSchema.tabId).toBeTruthy();
    });
});
