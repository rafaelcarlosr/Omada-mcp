import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { OmadaClient } from '../../src/omadaClient/index.js';
import { OmadaApiError } from '../../src/omadaClient/request.js';
import { registerReorderReportTabsTool } from '../../src/tools/reorderReportTabs.js';

type Handler = (
    args: Record<string, unknown>,
    extra: object
) => Promise<{ structuredContent?: Record<string, unknown>; content: { text: string }[] }>;

describe('tools/reorderReportTabs', () => {
    let handler: Handler;
    let definition: { inputSchema: Record<string, { parse: (value: unknown) => unknown }> };
    let client: Record<string, ReturnType<typeof vi.fn>>;
    let tabs: Record<string, unknown>[];

    beforeEach(() => {
        tabs = [
            { tabId: 't1', name: 'Summary', rank: 1, cardGroupList: [{ x: 1 }] },
            { tabId: 't2', name: 'Wired', rank: 2, cardGroupList: [] },
        ];
        client = {
            getTopologyDiscoveryStatus: vi.fn(async () => ({ status: 0 })),
            refreshTopology: vi.fn(async () => undefined),
            listTopologyNodes: vi.fn(async () => [{ mac: 'AA-BB-CC-DD-EE-01', isRoot: false }]),
            setTopologyRootNode: vi.fn(async () => undefined),
            listReportTabs: vi.fn(async () => ({ tabsLimited: false, reportTabVOs: tabs })),
            reorderReportTabs: vi.fn((next: Record<string, unknown>[]) => {
                tabs = next;
                return Promise.resolve(undefined);
            }),
        };
        const server = {
            registerTool: vi.fn((_name, def, fn) => {
                definition = def;
                handler = fn;
            }),
        } as unknown as McpServer;
        registerReorderReportTabsTool(server, client as unknown as OmadaClient);
    });

    it('sends the complete tabs with new ranks and verifies the order', async () => {
        expect((await handler({ tabIds: ['t2', 't1'] }, {})).structuredContent).toMatchObject({ result: { before: { order: ['t1', 't2'] } } });
        const result = await handler({ tabIds: ['t2', 't1'], dryRun: false }, {});
        expect(client.reorderReportTabs).toHaveBeenCalledWith(
            [
                { tabId: 't1', name: 'Summary', rank: 2, cardGroupList: [{ x: 1 }] },
                { tabId: 't2', name: 'Wired', rank: 1, cardGroupList: [] },
            ],
            undefined,
            undefined
        );
        expect(result.structuredContent).toMatchObject({ status: 'verified' });
    });

    it('refuses incomplete, unknown or repeated tab lists', async () => {
        await expect(handler({ tabIds: ['t1'], dryRun: false }, {})).rejects.toThrow('missing: t2');
        await expect(handler({ tabIds: ['t1', 't2', 'x'], dryRun: false }, {})).rejects.toThrow('unknown: x');
        await expect(handler({ tabIds: ['t1', 't1', 't2'], dryRun: false }, {})).rejects.toThrow('exactly once');
        client.listReportTabs.mockResolvedValueOnce(undefined);
        await expect(handler({ tabIds: ['t1'] }, {})).rejects.toThrow();
        expect(definition.inputSchema.tabIds).toBeTruthy();
    });
});
