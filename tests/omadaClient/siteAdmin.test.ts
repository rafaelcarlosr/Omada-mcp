import { readFileSync } from 'node:fs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { SiteAdminOperations } from '../../src/omadaClient/siteAdmin.js';

const spec: { paths: Record<string, Record<string, unknown>> } = {
    paths: Object.assign(
        {},
        ...['02-organization', '04.2-site-network-setting-general'].map(
            (name) =>
                JSON.parse(readFileSync(new URL(`../../docs/openapi/${name}.json`, import.meta.url), 'utf8')).paths as Record<
                    string,
                    Record<string, unknown>
                >
        )
    ),
};

type Ops = InstanceType<typeof SiteAdminOperations>;

const site = {
    name: 'b',
    region: 'Brazil',
    timeZone: 'America/Sao_Paulo',
    scenario: 'Office',
    deviceAccountSetting: { username: 'a', password: 'Aa1!Zx8wQe4Rt6Yu' },
};
const update = { region: 'Brazil', timeZone: 'America/Sao_Paulo', scenario: 'Office' };
const account = { username: 'a', password: 'Aa1!Zx8wQe4Rt6Yu' };

const cases: { method: keyof Ops; args: unknown[]; http: string; route: string; url: string; data?: unknown; params?: unknown }[] = [
    { method: 'createSite', args: [site], http: 'POST', route: '/sites', url: '/sites', data: site },
    { method: 'updateSite', args: ['s 1', update], http: 'PUT', route: '/sites/{siteId}', url: '/sites/s%201', data: update },
    { method: 'deleteSite', args: ['s1'], http: 'DELETE', route: '/sites/{siteId}', url: '/sites/s1' },
    { method: 'listSiteTags', args: [], http: 'GET', route: '/sites/tags', url: '/sites/tags' },
    { method: 'createSiteTag', args: [{ name: 't' }], http: 'POST', route: '/sites/tags', url: '/sites/tags', data: { name: 't' } },
    { method: 'updateSiteTag', args: ['t1', 'n'], http: 'PATCH', route: '/sites/tags', url: '/sites/tags', data: { tagId: 't1', name: 'n' } },
    { method: 'deleteSiteTag', args: ['t1'], http: 'DELETE', route: '/sites/tags', url: '/sites/tags', data: { tagId: 't1' } },
    { method: 'listScenarios', args: [], http: 'GET', route: '/scenarios/difference', url: '/scenarios/difference' },
    { method: 'createScenario', args: ['W'], http: 'POST', route: '/scenarios', url: '/scenarios', data: { name: 'W' } },
    { method: 'deleteScenario', args: ['W'], http: 'DELETE', route: '/scenarios', url: '/scenarios', data: { name: 'W' } },
    { method: 'listPlacedSitePositions', args: [], http: 'GET', route: '/placed-site-position', url: '/placed-site-position' },
    {
        method: 'listUnplacedSitePositions',
        args: [1, 10, 'lab'],
        http: 'GET',
        route: '/unplaced-site-position',
        url: '/unplaced-site-position',
        params: { page: 1, pageSize: 10, searchKey: 'lab' },
    },
    { method: 'getSiteOverrides', args: [['a', 'b']], http: 'GET', route: '/site-overrides', url: '/site-overrides', params: { siteIds: 'a,b' } },
    {
        method: 'getSiteHealthOverview',
        args: ['s1'],
        http: 'GET',
        route: '/sites/{siteId}/global-dashboard/site-map/abnormal',
        url: '/sites/s1/global-dashboard/site-map/abnormal',
    },
    { method: 'getSiteJumbo', args: ['s1'], http: 'GET', route: '/sites/{siteId}/jumbo', url: '/sites/s1/jumbo' },
    {
        method: 'setSiteJumbo',
        args: [{ size: 9000 }, 's1'],
        http: 'PUT',
        route: '/sites/{siteId}/jumbo',
        url: '/sites/s1/jumbo',
        data: { size: 9000 },
    },
    { method: 'getSiteLagHashAlgorithm', args: ['s1'], http: 'GET', route: '/sites/{siteId}/lag-hash-alg', url: '/sites/s1/lag-hash-alg' },
    {
        method: 'setSiteLagHashAlgorithm',
        args: [{ type: 2 }, 's1'],
        http: 'PUT',
        route: '/sites/{siteId}/lag-hash-alg',
        url: '/sites/s1/lag-hash-alg',
        data: { type: 2 },
    },
    {
        method: 'setSiteDeviceAccount',
        args: [account, 's1'],
        http: 'PUT',
        route: '/sites/{siteId}/device-account',
        url: '/sites/s1/device-account',
        data: account,
    },
];

describe('omadaClient/siteAdmin', () => {
    const request = { request: vi.fn(), ensureSuccess: vi.fn((value: { result?: unknown }) => value.result) };
    const siteOps = { resolveSiteId: vi.fn(async (id?: string) => id ?? 'site-1') };
    const buildPath = vi.fn((path: string) => `/openapi/v1/cid${path}`);
    let operations: Ops;

    beforeEach(() => {
        vi.clearAllMocks();
        request.request.mockResolvedValue({ errorCode: 0, result: { ok: true } });
        operations = new SiteAdminOperations(request as never, siteOps as never, buildPath);
    });

    it.each(cases)('$method sends $http to the documented route', async ({ method, args, http, route, url, data, params }) => {
        expect(spec.paths[`/openapi/v1/{omadacId}${route}`]?.[http.toLowerCase()]).toBeTruthy();
        const fn = operations[method] as (...input: unknown[]) => Promise<unknown>;
        await expect(fn.call(operations, ...args)).resolves.toEqual({ ok: true });
        expect(request.request).toHaveBeenCalledWith(
            { url: `/openapi/v1/cid${url}`, method: http, ...(data === undefined ? {} : { data }), ...(params === undefined ? {} : { params }) },
            true,
            undefined
        );
    });

    it('uses the default site for site settings and omits an empty search', async () => {
        await operations.getSiteJumbo();
        expect(request.request).toHaveBeenLastCalledWith({ url: '/openapi/v1/cid/sites/site-1/jumbo', method: 'GET' }, true, undefined);
        await operations.listUnplacedSitePositions(1, 10, undefined, { 'X-Request-ID': 'r1' });
        expect(request.request).toHaveBeenLastCalledWith(
            { url: '/openapi/v1/cid/unplaced-site-position', method: 'GET', params: { page: 1, pageSize: 10 } },
            true,
            { 'X-Request-ID': 'r1' }
        );
    });

    it('rejects invalid input before sending', async () => {
        await expect(operations.deleteSite(' ')).rejects.toThrow('An identifier is required.');
        await expect(operations.getSiteOverrides([])).rejects.toThrow('At least one site ID is required.');
        await expect(operations.setSiteJumbo({ size: 100 })).rejects.toThrow();
        await expect(operations.updateSiteTag('', 'x')).rejects.toThrow();
        expect(request.request).not.toHaveBeenCalled();
    });
});
