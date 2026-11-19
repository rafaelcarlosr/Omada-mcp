import { readFileSync } from 'node:fs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { WirelessOperations } from '../../src/omadaClient/wireless.js';

const spec = JSON.parse(readFileSync(new URL('../../docs/openapi/04.3-site-network-setting-network.json', import.meta.url), 'utf8')) as {
    paths: Record<string, Record<string, unknown>>;
};

type Ops = InstanceType<typeof WirelessOperations>;
const BASE = '/openapi/v1/cid/sites/s1';

const cases: { method: keyof Ops; args: unknown[]; http: string; route: string; url: string; data?: unknown }[] = [
    { method: 'getSsidConfig', args: ['x1'], http: 'GET', route: '/wireless-network/ssids/{ssidId}', url: '/wireless-network/ssids/x1' },
    {
        method: 'listDuplicateSsidNames',
        args: [],
        http: 'GET',
        route: '/wireless-network/ssids/duplicate-name',
        url: '/wireless-network/ssids/duplicate-name',
    },
    {
        method: 'listSsidApGroups',
        args: ['x1'],
        http: 'GET',
        route: '/wireless-network/ssids/{ssidId}/ap-groups',
        url: '/wireless-network/ssids/x1/ap-groups',
    },
    {
        method: 'setSsidApGroups',
        args: ['x1', ['g1']],
        http: 'PATCH',
        route: '/wireless-network/ssids/{ssidId}/ap-groups',
        url: '/wireless-network/ssids/x1/ap-groups',
        data: { apGroupIds: ['g1'] },
    },
    {
        method: 'setSsidSection',
        args: ['x1', 'enable', { ssidEnable: false }],
        http: 'PATCH',
        route: '/wireless-network/ssids/{ssidId}/enable',
        url: '/wireless-network/ssids/x1/enable',
        data: { ssidEnable: false },
    },
    {
        method: 'setSsidSection',
        args: ['x1', 'band-steer', { mode: 1 }],
        http: 'PATCH',
        route: '/wireless-network/ssids/{ssidId}/band-steer',
        url: '/wireless-network/ssids/x1/band-steer',
        data: { mode: 1 },
    },
    {
        method: 'setSsidRateControl',
        args: ['w1', 'x1', { rate2gCtrlEnable: false, rate5gCtrlEnable: false }],
        http: 'PATCH',
        route: '/wireless-network/wlans/{wlanId}/ssids/{ssidId}/update-rate-control',
        url: '/wireless-network/wlans/w1/ssids/x1/update-rate-control',
        data: { rate2gCtrlEnable: false, rate5gCtrlEnable: false },
    },
    { method: 'getApGroup', args: ['g1'], http: 'GET', route: '/ap-groups/{apGroupId}/info', url: '/ap-groups/g1/info' },
    { method: 'getApGroupCount', args: [], http: 'GET', route: '/count-ap-groups', url: '/count-ap-groups' },
    { method: 'createApGroup', args: [{ name: 'g' }], http: 'POST', route: '/ap-groups', url: '/ap-groups', data: { name: 'g' } },
    {
        method: 'updateApGroup',
        args: ['g1', { name: 'g2' }],
        http: 'PATCH',
        route: '/ap-groups/{apGroupId}',
        url: '/ap-groups/g1',
        data: { name: 'g2' },
    },
    { method: 'deleteApGroup', args: ['g1'], http: 'DELETE', route: '/ap-groups/{apGroupId}', url: '/ap-groups/g1' },
];

describe('omadaClient/wireless', () => {
    const request = {
        request: vi.fn(),
        fetchPaginated: vi.fn(),
        ensureSuccess: vi.fn((value: { result?: unknown }) => value.result),
    };
    const site = { resolveSiteId: vi.fn(async (id?: string) => id ?? 's1') };
    let operations: Ops;

    beforeEach(() => {
        vi.clearAllMocks();
        request.request.mockResolvedValue({ errorCode: 0, result: { ok: true } });
        request.fetchPaginated.mockResolvedValue([{ id: 'g1' }]);
        operations = new WirelessOperations(request as never, site as never, (path) => `/openapi/v1/cid${path}`);
    });

    it.each(cases)('$method sends $http to $route', async ({ method, args, http, route, url, data }) => {
        expect(spec.paths[`/openapi/v1/{omadacId}/sites/{siteId}${route}`]?.[http.toLowerCase()]).toBeTruthy();
        const fn = operations[method] as (...input: unknown[]) => Promise<unknown>;
        await expect(fn.call(operations, ...args, 's1', { 'X-Request-ID': 'r1' })).resolves.toEqual({ ok: true });
        expect(request.request).toHaveBeenCalledWith({ url: `${BASE}${url}`, method: http, ...(data === undefined ? {} : { data }) }, true, {
            'X-Request-ID': 'r1',
        });
    });

    it('reads AP groups and grouped APs as complete collections', async () => {
        await expect(operations.listApGroups()).resolves.toEqual([{ id: 'g1' }]);
        await operations.listApGroupAps('s2');
        expect(request.fetchPaginated).toHaveBeenNthCalledWith(1, `${BASE}/ap-groups`, {}, undefined, 100);
        expect(request.fetchPaginated).toHaveBeenNthCalledWith(2, '/openapi/v1/cid/sites/s2/ap-groups/aps', {}, undefined, 100);
        expect(spec.paths['/openapi/v1/{omadacId}/sites/{siteId}/ap-groups/aps']?.get).toBeTruthy();
    });

    it('validates input before sending', async () => {
        await expect(operations.setSsidSection('x1', 'enable', {} as never)).rejects.toThrow();
        await expect(operations.setSsidSection('x1', 'rate-control' as never, {} as never)).rejects.toThrow('Unsupported SSID section');
        await expect(operations.setSsidApGroups('x1', 'g1' as never)).rejects.toThrow();
        await expect(operations.deleteApGroup(' ')).rejects.toThrow('An identifier is required.');
        expect(request.request).not.toHaveBeenCalled();
    });
});
