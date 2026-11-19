import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { OmadaClient } from '../../src/omadaClient/index.js';
import { OmadaApiError } from '../../src/omadaClient/request.js';
import { registerRefreshTopologyTool } from '../../src/tools/refreshTopology.js';

type Handler = (
    args: Record<string, unknown>,
    extra: object
) => Promise<{ structuredContent?: Record<string, unknown>; content: { text: string }[] }>;

describe('tools/refreshTopology', () => {
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
        registerRefreshTopologyTool(server, client as unknown as OmadaClient);
    });

    it('previews the discovery status, then starts a refresh', async () => {
        expect((await handler({}, {})).structuredContent).toMatchObject({ status: 'planned', result: { target: { discovery: { status: 0 } } } });
        expect((await handler({ siteId: 's1', dryRun: false }, {})).structuredContent).toMatchObject({ status: 'submitted' });
        expect(client.refreshTopology).toHaveBeenCalledWith('s1', undefined);
    });

    it('surfaces rejections', async () => {
        client.refreshTopology.mockRejectedValueOnce(new OmadaApiError(-1001, 'rejected'));
        await expect(handler({ dryRun: false }, {})).rejects.toThrow('(errorCode -1001)');
        expect(definition.inputSchema.dryRun).toBeTruthy();
    });
});
