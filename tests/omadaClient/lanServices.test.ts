import { readFileSync } from 'node:fs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { LanServiceOperations } from '../../src/omadaClient/lanServices.js';

const paths: Record<string, Record<string, unknown>> = Object.assign(
    {},
    ...['04.3-site-network-setting-network', '04.7-site-network-setting-transmission', '05-site-device-config'].map(
        (name) => JSON.parse(readFileSync(new URL(`../../docs/openapi/${name}.json`, import.meta.url), 'utf8')).paths
    )
);

type Ops = InstanceType<typeof LanServiceOperations>;
const mc = {
    name: 'm',
    networks: [{ networkId: 'n1', vlanType: 0, vlan: 1 }],
    protocol: 0,
    unknownMulticastRule: 0,
    floodKnownEnable: false,
    querierEnable: false,
    routerPortEnable: false,
};
const rule = { enable: false, name: 'r', ssidIdList: ['s1'], ruleCombine: [{ ouiProfileId: 'o1', vlanId: 20, priority: 3 }] };

const cases: { method: keyof Ops; args: unknown[]; http: string; route: string; url: string; data?: unknown }[] = [
    { method: 'getLanNetwork', args: ['n1'], http: 'GET', route: '/lan-networks/{networkId}', url: '/lan-networks/n1' },
    { method: 'listAllLanNetworks', args: [], http: 'GET', route: '/lan-networks/all', url: '/lan-networks/all' },
    {
        method: 'listDhcpReservationTargets',
        args: [],
        http: 'GET',
        route: '/networks/server-for-reservation',
        url: '/networks/server-for-reservation',
    },
    {
        method: 'setDnsCacheSetting',
        args: [{ enable: true, ttl: 600 }],
        http: 'PUT',
        route: '/setting/service/dns-cache',
        url: '/setting/service/dns-cache',
        data: { enable: true, ttl: 600 },
    },
    { method: 'clearDnsCache', args: [], http: 'POST', route: '/setting/dns-cache-data/clear', url: '/setting/dns-cache-data/clear', data: {} },
    {
        method: 'setDnsProxy',
        args: [{ enable: false }],
        http: 'PATCH',
        route: '/setting/service/dns-proxy',
        url: '/setting/service/dns-proxy',
        data: { enable: false },
    },
    {
        method: 'setIpMacBindingGeneralSetting',
        args: [{ enable: false }],
        http: 'PATCH',
        route: '/ip-mac-bind',
        url: '/ip-mac-bind',
        data: { enable: false },
    },
    { method: 'createLanMulticast', args: [mc], http: 'POST', route: '/lan-multicasts', url: '/lan-multicasts', data: mc },
    { method: 'updateLanMulticast', args: ['m1', mc], http: 'PATCH', route: '/lan-multicasts/{multicastId}', url: '/lan-multicasts/m1', data: mc },
    { method: 'deleteLanMulticast', args: ['m1'], http: 'DELETE', route: '/lan-multicasts/{multicastId}', url: '/lan-multicasts/m1' },
    { method: 'createApOuiRule', args: [rule], http: 'POST', route: '/ap-oui-rules', url: '/ap-oui-rules', data: rule },
    { method: 'updateApOuiRule', args: ['r1', rule], http: 'PUT', route: '/ap-oui-rules/{ouiBasedVlanId}', url: '/ap-oui-rules/r1', data: rule },
    { method: 'deleteApOuiRule', args: ['r1'], http: 'DELETE', route: '/ap-oui-rules/{ouiBasedVlanId}', url: '/ap-oui-rules/r1' },
];

describe('omadaClient/lanServices', () => {
    const request = { request: vi.fn(), fetchPaginated: vi.fn(), ensureSuccess: vi.fn((value: { result?: unknown }) => value.result) };
    const site = { resolveSiteId: vi.fn(async (id?: string) => id ?? 's1') };
    let operations: Ops;

    beforeEach(() => {
        vi.clearAllMocks();
        request.request.mockResolvedValue({ errorCode: 0, result: { ok: true } });
        request.fetchPaginated.mockResolvedValue([{ id: 'x' }]);
        operations = new LanServiceOperations(request as never, site as never, (path) => `/openapi/v1/cid${path}`);
    });

    it.each(cases)('$method sends $http to $route', async ({ method, args, http, route, url, data }) => {
        expect(paths[`/openapi/v1/{omadacId}/sites/{siteId}${route}`]?.[http.toLowerCase()]).toBeTruthy();
        const fn = operations[method] as (...input: unknown[]) => Promise<unknown>;
        await expect(fn.call(operations, ...args, 's1', { 'X-Request-ID': 'r1' })).resolves.toEqual({ ok: true });
        expect(request.request).toHaveBeenCalledWith(
            { url: `/openapi/v1/cid/sites/s1${url}`, method: http, ...(data === undefined ? {} : { data }) },
            true,
            { 'X-Request-ID': 'r1' }
        );
    });

    it.each([
        ['listDhcpClients', '/setting/service/dhcp/user-list'],
        ['listLanMulticasts', '/lan-multicasts'],
        ['listApOuiRules', '/ap-oui-rules'],
    ] as const)('%s reads every page of %s', async (method, route) => {
        expect(paths[`/openapi/v1/{omadacId}/sites/{siteId}${route}`]?.get).toBeTruthy();
        await expect(operations[method]()).resolves.toEqual([{ id: 'x' }]);
        expect(request.fetchPaginated).toHaveBeenCalledWith(`/openapi/v1/cid/sites/s1${route}`, {}, undefined, 100);
    });

    it('validates bodies and identifiers before sending', async () => {
        await expect(operations.createLanMulticast({ ...mc, id: 'x' } as never)).rejects.toThrow();
        await expect(operations.createApOuiRule({ name: 'r' } as never)).rejects.toThrow();
        await expect(operations.deleteApOuiRule(' ')).rejects.toThrow('An identifier is required.');
        expect(request.request).not.toHaveBeenCalled();
    });
});
