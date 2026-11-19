import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { OmadaClient } from '../../src/omadaClient/index.js';
import { OmadaApiError } from '../../src/omadaClient/request.js';
import { registerClearDnsCacheTool } from '../../src/tools/clearDnsCache.js';

type Handler = (
    args: Record<string, unknown>,
    extra: object
) => Promise<{ structuredContent?: Record<string, unknown>; content: { text: string }[] }>;

const network = { networkId: 'n1', networkName: 'Default', vlanType: 0, vlan: 1 };

describe('tools/clearDnsCache', () => {
    let handler: Handler;
    let definition: { inputSchema: Record<string, { parse: (value: unknown) => unknown }> };
    let client: Record<string, ReturnType<typeof vi.fn>>;
    let dnsCache: Record<string, unknown>;
    let dnsProxy: Record<string, unknown>;
    let ipMac: Record<string, unknown>;
    let multicasts: Record<string, unknown>[];
    let rules: Record<string, unknown>[];

    beforeEach(() => {
        dnsCache = { enable: false };
        dnsProxy = { enable: false, supportDnsOverride: true };
        ipMac = { enable: false };
        multicasts = [
            {
                id: 'm1',
                name: 'iptv',
                siteId: 's1',
                networks: [network],
                protocol: 0,
                unknownMulticastRule: 0,
                floodKnownEnable: false,
                querierEnable: false,
                routerPortEnable: false,
                resource: 0,
                routerPorts: [],
            },
        ];
        rules = [
            {
                id: 'r1',
                enable: false,
                name: 'phones',
                ssidList: [{ ssidId: 's1', ssidName: 'x' }],
                ruleCombine: [{ vlanId: 20, priority: 3, ouiProfileId: 'o1', ouiProfileName: 'p' }],
            },
        ];
        const toRule = (id: string, body: Record<string, unknown>) => ({
            id,
            enable: body.enable,
            name: body.name,
            ssidList: (body.ssidIdList as string[]).map((ssidId) => ({ ssidId })),
            ruleCombine: body.ruleCombine,
        });
        client = {
            getDnsCacheSetting: vi.fn(async () => dnsCache),
            setDnsCacheSetting: vi.fn((body: Record<string, unknown>) => {
                dnsCache = body;
                return Promise.resolve(undefined);
            }),
            clearDnsCache: vi.fn(async () => undefined),
            getDnsProxy: vi.fn(async () => dnsProxy),
            setDnsProxy: vi.fn((body: Record<string, unknown>) => {
                dnsProxy = { ...body, supportDnsOverride: true };
                return Promise.resolve(undefined);
            }),
            getIpMacBindingGeneralSetting: vi.fn(async () => ipMac),
            setIpMacBindingGeneralSetting: vi.fn((body: Record<string, unknown>) => {
                ipMac = body.enable ? body : { enable: false };
                return Promise.resolve(undefined);
            }),
            listLanMulticasts: vi.fn(async () => multicasts),
            createLanMulticast: vi.fn((body: Record<string, unknown>) => {
                multicasts = [...multicasts, { id: 'm2', ...body }];
                return Promise.resolve({ id: 'm2' });
            }),
            updateLanMulticast: vi.fn((id: string, body: Record<string, unknown>) => {
                multicasts = multicasts.map((row) => (row.id === id ? { ...row, ...body } : row));
                return Promise.resolve(undefined);
            }),
            deleteLanMulticast: vi.fn((id: string) => {
                multicasts = multicasts.filter((row) => row.id !== id);
                return Promise.resolve(undefined);
            }),
            listApOuiRules: vi.fn(async () => rules),
            createApOuiRule: vi.fn((body: Record<string, unknown>) => {
                rules = [...rules, toRule('r2', body)];
                return Promise.resolve({ id: 'r2' });
            }),
            updateApOuiRule: vi.fn((id: string, body: Record<string, unknown>) => {
                rules = rules.map((row) => (row.id === id ? toRule(id, body) : row));
                return Promise.resolve(undefined);
            }),
            deleteApOuiRule: vi.fn((id: string) => {
                rules = rules.filter((row) => row.id !== id);
                return Promise.resolve(undefined);
            }),
        };
        const server = {
            registerTool: vi.fn((_name, def, fn) => {
                definition = def;
                handler = fn;
            }),
        } as unknown as McpServer;
        registerClearDnsCacheTool(server, client as unknown as OmadaClient);
    });

    it('previews, then clears', async () => {
        expect((await handler({}, {})).structuredContent).toMatchObject({ status: 'planned', result: { target: { siteId: 'default site' } } });
        expect((await handler({ siteId: 's1', dryRun: false }, {})).structuredContent).toMatchObject({ status: 'submitted' });
        expect(client.clearDnsCache).toHaveBeenCalledWith('s1', undefined);
    });

    it('surfaces rejections', async () => {
        client.clearDnsCache.mockRejectedValueOnce(new OmadaApiError(-1001, 'rejected'));
        await expect(handler({ dryRun: false }, {})).rejects.toThrow('(errorCode -1001)');
        expect(definition.inputSchema.dryRun).toBeTruthy();
    });
});
