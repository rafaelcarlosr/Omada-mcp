import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { OmadaClient } from '../../src/omadaClient/index.js';
import { OmadaApiError } from '../../src/omadaClient/request.js';
import { registerSetTopologyRootNodeTool } from '../../src/tools/setTopologyRootNode.js';

type Handler = (
    args: Record<string, unknown>,
    extra: object
) => Promise<{ structuredContent?: Record<string, unknown>; content: { text: string }[] }>;

describe('tools/setTopologyRootNode', () => {
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
        registerSetTopologyRootNodeTool(server, client as unknown as OmadaClient);
    });

    it('previews the candidates, then sets a manual root', async () => {
        const payload = { type: 'switch', mac: 'AA-BB-CC-DD-EE-01', discoveryMode: 0 };
        expect((await handler({ payload }, {})).structuredContent).toMatchObject({
            status: 'planned',
            result: { target: { candidates: [{ isRoot: false }] } },
        });
        await handler({ payload, dryRun: false }, {});
        expect(client.setTopologyRootNode).toHaveBeenCalledWith(payload, undefined, undefined);
        await handler({ payload: { type: 'other', discoveryMode: 1 }, dryRun: false }, {});
        expect(client.setTopologyRootNode).toHaveBeenLastCalledWith({ type: 'other', discoveryMode: 1 }, undefined, undefined);
    });

    it('refuses a manual root without a device', async () => {
        await expect(handler({ payload: { type: 'switch', discoveryMode: 0 }, dryRun: false }, {})).rejects.toThrow('needs mac or macList');
        expect(() => definition.inputSchema.payload.parse({ type: 'router' })).toThrow();
    });
});
