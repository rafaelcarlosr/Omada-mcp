import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { OmadaClient } from '../../src/omadaClient/index.js';
import { OmadaApiError } from '../../src/omadaClient/request.js';
import { registerSetGatewayCustomAclsStateTool } from '../../src/tools/setGatewayCustomAclsState.js';

type Handler = (
    args: Record<string, unknown>,
    extra: object
) => Promise<{ structuredContent?: Record<string, unknown>; content: { text: string }[] }>;

const acl = {
    status: true,
    description: 'web',
    direction: 1,
    policy: 0,
    protocol: 6,
    sourceList: ['10.0.0.0/24'],
    destinationList: ['1.1.1.1'],
    destinationPort: '443',
    logStatus: false,
};

describe('tools/setGatewayCustomAclsState', () => {
    let handler: Handler;
    let definition: { inputSchema: Record<string, { parse: (value: unknown) => unknown }> };
    let client: Record<string, ReturnType<typeof vi.fn>>;
    let firewall: Record<string, unknown>;
    let attack: Record<string, unknown>;
    let globalFilter: Record<string, unknown>;
    let urlRules: Record<string, unknown>[];
    let acls: Record<string, unknown>[];
    let custom: Record<string, unknown>[];

    beforeEach(() => {
        firewall = { icmp: 45 };
        attack = { tcpConnEnable: true, tcpConnLimit: 9000 };
        globalFilter = {};
        urlRules = [
            { id: 'u1', index: 1 },
            { id: 'u2', index: 2 },
        ];
        acls = [
            { id: 'a1', index: 1 },
            { id: 'a2', index: 2 },
        ];
        custom = [{ id: 'c1', index: 1, ...acl, extra: 'x' }];
        const reorder = (rows: Record<string, unknown>[], indexes: Record<string, number>) =>
            rows.map((row) => ({ ...row, index: indexes[String(row.id)] }));
        client = {
            getFirewallSetting: vi.fn(async () => firewall),
            resetFirewallSetting: vi.fn(() => {
                firewall = { icmp: 30 };
                return Promise.resolve(undefined);
            }),
            getAttackDefenseSetting: vi.fn(async () => attack),
            getAttackDefenseDefaults: vi.fn(async () => ({ tcpConnEnable: false, tcpConnLimit: 10000 })),
            resetAttackDefenseSetting: vi.fn(() => {
                attack = { tcpConnEnable: false, tcpConnLimit: 10000 };
                return Promise.resolve(undefined);
            }),
            getUrlFilterGeneral: vi.fn(async () => globalFilter),
            setUrlFilterGlobalSetting: vi.fn((body: Record<string, unknown>) => {
                globalFilter = { ...globalFilter, ...body };
                return Promise.resolve(undefined);
            }),
            listUrlFilterRules: vi.fn(async () => urlRules),
            reorderUrlFilterRules: vi.fn((_type: string, indexes: Record<string, number>) => {
                urlRules = reorder(urlRules, indexes);
                return Promise.resolve(undefined);
            }),
            listOsgAcls: vi.fn(async () => acls),
            listEapAcls: vi.fn(async () => acls),
            getOswAclList: vi.fn(async () => ({ data: acls, totalRows: acls.length })),
            reorderAcls: vi.fn((_type: string, indexes: Record<string, number>) => {
                acls = reorder(acls, indexes);
                return Promise.resolve(undefined);
            }),
            clearGatewayAclHitCounts: vi.fn(async () => undefined),
            clearGatewayCustomAclHitCounts: vi.fn(async () => undefined),
            getOsgCustomAclList: vi.fn(async () => ({ data: custom, totalRows: custom.length })),
            updateGatewayCustomAcls: vi.fn((changes: { adds?: Record<string, unknown>[]; modifies?: Record<string, unknown>[] }) => {
                for (const add of changes.adds ?? []) custom = [...custom, { id: 'c2', ...add }];
                for (const mod of changes.modifies ?? []) custom = custom.map((row) => (row.id === mod.id ? { ...row, ...mod } : row));
                return Promise.resolve(undefined);
            }),
            reorderGatewayCustomAcls: vi.fn((indexes: Record<string, number>) => {
                custom = reorder(custom, indexes);
                return Promise.resolve(undefined);
            }),
            setGatewayCustomAclsState: vi.fn((ids: string[], status: number, log: number) => {
                custom = custom.map((row) =>
                    ids.includes(String(row.id))
                        ? { ...row, ...(status === 2 ? {} : { status: status === 0 }), ...(log === 2 ? {} : { logStatus: log === 0 }) }
                        : row
                );
                return Promise.resolve(undefined);
            }),
            deleteGatewayCustomAcls: vi.fn((ids: string[]) => {
                custom = custom.filter((row) => !ids.includes(String(row.id)));
                return Promise.resolve(undefined);
            }),
        };
        const server = {
            registerTool: vi.fn((_name, def, fn) => {
                definition = def;
                handler = fn;
            }),
        } as unknown as McpServer;
        registerSetGatewayCustomAclsStateTool(server, client as unknown as OmadaClient);
    });

    it('turns ACLs off, keeping logging, and verifies per ACL', async () => {
        expect((await handler({ aclIds: ['c1'], enabled: false }, {})).structuredContent).toMatchObject({
            status: 'planned',
            result: { before: { c1: { status: true, logStatus: false } } },
        });
        const result = await handler({ aclIds: ['c1', 'c1'], enabled: false, dryRun: false }, {});
        expect(client.setGatewayCustomAclsState).toHaveBeenCalledWith(['c1'], 1, 2, undefined, undefined);
        expect(result.structuredContent).toMatchObject({ status: 'verified' });
        await handler({ aclIds: ['c1'], enabled: true, logEnabled: true, dryRun: false }, {});
        expect(client.setGatewayCustomAclsState).toHaveBeenLastCalledWith(['c1'], 0, 0, undefined, undefined);
    });

    it('needs a change and known IDs', async () => {
        await expect(handler({ aclIds: ['c1'], dryRun: false }, {})).rejects.toThrow('Set enabled, logEnabled or both');
        await expect(handler({ aclIds: ['zz'], enabled: true, dryRun: false }, {})).rejects.toThrow('No gateway custom ACL with id zz');
        client.setGatewayCustomAclsState.mockRejectedValueOnce(new OmadaApiError(-33643, 'Log remote setting is disabled.'));
        await expect(handler({ aclIds: ['c1'], logEnabled: true, dryRun: false }, {})).rejects.toThrow('(errorCode -33643)');
        expect(definition.inputSchema.aclIds).toBeTruthy();
    });
});
