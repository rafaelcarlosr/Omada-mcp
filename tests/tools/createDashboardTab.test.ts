import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { OmadaClient } from '../../src/omadaClient/index.js';
import { OmadaApiError } from '../../src/omadaClient/request.js';
import { registerCreateDashboardTabTool } from '../../src/tools/createDashboardTab.js';

type Handler = (
    args: Record<string, unknown>,
    extra: object
) => Promise<{ structuredContent?: Record<string, unknown>; content: { text: string }[] }>;

describe('tools/createDashboardTab', () => {
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
        registerCreateDashboardTabTool(server, client as unknown as OmadaClient);
    });

    it('previews, then creates once and verifies by name', async () => {
        expect((await handler({ name: 'Ops' }, {})).structuredContent).toMatchObject({ status: 'planned' });
        const result = await handler({ name: 'Ops', siteId: 's-1', dryRun: false }, {});
        expect(client.createDashboardTab).toHaveBeenCalledWith('Ops', 's-1', undefined);
        expect(result.structuredContent).toMatchObject({ status: 'verified', result: { createdId: 'new' } });
    });

    it('refuses duplicate names and surfaces rejections', async () => {
        expect(() => definition.inputSchema.name.parse('')).toThrow();
        await expect(handler({ name: 'Network', dryRun: false }, {})).rejects.toThrow('already exists');
        client.createDashboardTab.mockRejectedValueOnce(new OmadaApiError(-34700, 'rejected'));
        await expect(handler({ name: 'Ops', dryRun: false }, {})).rejects.toThrow('(errorCode -34700)');
    });
});
