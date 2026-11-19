import { readFileSync } from 'node:fs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { DashboardOperations } from '../../src/omadaClient/dashboard.js';

const spec: { paths: Record<string, Record<string, unknown>> } = {
    paths: Object.assign(
        {},
        ...['13-monitor', '04.6-site-network-setting-security', '06-client', '15-insight'].map(
            (name) =>
                JSON.parse(readFileSync(new URL(`../../docs/openapi/${name}.json`, import.meta.url), 'utf8')).paths as Record<
                    string,
                    Record<string, unknown>
                >
        )
    ),
};

type Ops = InstanceType<typeof DashboardOperations>;
const range = { start: 100, end: 200 };
const D = '/sites/{siteId}/dashboard';

const ranged: [keyof Ops, string][] = [
    ['getTopAps', 'top-aps'],
    ['getMostActiveApps', 'mostActiveAppTraffic'],
    ['getAllNetworkActivity', 'allNetworkActivity'],
    ['getClientAssociationActivities', 'client-association-activities'],
    ['getClientAssociationTimeDistribution', 'client-association-time-distribution'],
];
const paged: [keyof Ops, string][] = [
    ['listClientTraffic', 'clientTraffic'],
    ['listAppCategories', 'categoryInfo'],
    ['listBlockedApps', 'blockApp'],
    ['listAllowedApps', 'allowApp'],
];
const byId: [keyof Ops, string, string, string][] = [
    ['getClientAppTraffic', 'specificClientInfo/{clientMac}', 'AA-BB-CC-DD-EE-01', 'specificClientInfo/AA-BB-CC-DD-EE-01'],
    ['getAppClientTraffic', 'specificAppInfo/{applicationId}', 'app 1', 'specificAppInfo/app%201'],
    ['getCategoryClientTraffic', 'categoryUserInfo/{familyId}', 'f1', 'categoryUserInfo/f1'],
    ['getCategoryAppTraffic', 'categoryAppInfo/{familyId}', 'f1', 'categoryAppInfo/f1'],
];
const plain: [keyof Ops, string][] = [
    ['getLongestClientUptime', 'longest-uptime'],
    ['getCurrentClientCount', 'current-client-num'],
    ['getClientsBubble', 'clients-bubble'],
    ['getClientSsidDistribution', 'client-ssid-distribution'],
    ['getClientSignalDistribution', 'client-signal-distribution'],
    ['getClientRssiDistribution', 'client-rssi-distribution'],
    ['getClientFrequencyDistribution', 'client-freq-distribution'],
    ['getApDensity', 'ap-density'],
    ['getGatewayIspLoad', 'gateway/isp/load'],
    ['getNetworkOverviewCard', 'card/overview'],
    ['listDashboardTabs', 'tabs'],
    ['listDashboardTabsWithoutOverall', 'without-overall-tabs'],
];

describe('omadaClient/dashboard', () => {
    const request = { request: vi.fn(), ensureSuccess: vi.fn((value: { result?: unknown }) => value.result) };
    const site = { resolveSiteId: vi.fn(async (id?: string) => id ?? 'site-1') };
    const buildPath = vi.fn((path: string, version = 'v1') => `/openapi/${version}/cid${path}`);
    let operations: Ops;

    beforeEach(() => {
        vi.clearAllMocks();
        request.request.mockResolvedValue({ errorCode: 0, result: { ok: true } });
        operations = new DashboardOperations(request as never, site as never, buildPath);
    });

    const expectCall = (url: string, method: string, extra: Record<string, unknown> = {}) =>
        expect(request.request).toHaveBeenCalledWith({ url: `/openapi/v1/cid/sites/site-9/dashboard/${url}`, method, ...extra }, true, {
            'X-Request-ID': 'r1',
        });

    it.each(ranged)('%s reads %s with an epoch-second range', async (method, route) => {
        expect(spec.paths[`/openapi/v1/{omadacId}${D}/${route}`]?.get).toBeTruthy();
        await expect(
            (operations[method] as (...a: unknown[]) => Promise<unknown>).call(operations, range, 'site-9', { 'X-Request-ID': 'r1' })
        ).resolves.toEqual({
            ok: true,
        });
        expectCall(route, 'GET', { params: range });
    });

    it.each(paged)('%s reads %s by page', async (method, route) => {
        expect(spec.paths[`/openapi/v1/{omadacId}${D}/${route}`]?.get).toBeTruthy();
        await (operations[method] as (...a: unknown[]) => Promise<unknown>).call(operations, range, 2, 5, 'site-9', { 'X-Request-ID': 'r1' });
        expectCall(route, 'GET', { params: { ...range, page: 2, pageSize: 5 } });
    });

    it.each(byId)('%s reads %s', async (method, route, id, url) => {
        expect(spec.paths[`/openapi/v1/{omadacId}${D}/${route}`]?.get).toBeTruthy();
        await (operations[method] as (...a: unknown[]) => Promise<unknown>).call(operations, id, range, 'site-9', { 'X-Request-ID': 'r1' });
        expectCall(url, 'GET', { params: range });
    });

    it.each(plain)('%s reads %s', async (method, route) => {
        expect(spec.paths[`/openapi/v1/{omadacId}${D}/${route}`]?.get).toBeTruthy();
        await (operations[method] as (...a: unknown[]) => Promise<unknown>).call(operations, 'site-9', { 'X-Request-ID': 'r1' });
        expectCall(route, 'GET');
    });

    it('uses the v2 route for the most active EAPs by traffic', async () => {
        expect(spec.paths[`/openapi/v2/{omadacId}${D}/most-active-eaps`]?.get).toBeTruthy();
        await operations.listMostActiveEapsByTraffic(5, range);
        expect(request.request).toHaveBeenCalledWith(
            { url: '/openapi/v2/cid/sites/site-1/dashboard/most-active-eaps', method: 'GET', params: { deviceNum: 5, ...range } },
            true,
            undefined
        );
    });

    it('posts the client traffic query and the tab changes to their routes', async () => {
        expect(spec.paths[`/openapi/v1/{omadacId}${D}/clientTraffic`]?.post).toBeTruthy();
        await operations.searchClientTraffic({ page: 1, pageSize: 10 }, 'site-9', { 'X-Request-ID': 'r1' });
        expectCall('clientTraffic', 'POST', { data: { page: 1, pageSize: 10 } });
        expect(spec.paths[`/openapi/v1/{omadacId}${D}/tabs`]?.post).toBeTruthy();
        await operations.createDashboardTab('Ops', 'site-9', { 'X-Request-ID': 'r1' });
        expectCall('tabs', 'POST', { data: { name: 'Ops' } });
        expect(spec.paths[`/openapi/v1/{omadacId}${D}/tabs/{tabId}`]?.patch).toBeTruthy();
        await operations.updateDashboardTab('t1', { reset: true }, 'site-9', { 'X-Request-ID': 'r1' });
        expectCall('tabs/t1', 'PATCH', { data: { reset: true } });
        expect(spec.paths[`/openapi/v1/{omadacId}${D}/tabs/{tabId}`]?.delete).toBeTruthy();
        await operations.deleteDashboardTab('t1', 'site-9', { 'X-Request-ID': 'r1' });
        expectCall('tabs/t1', 'DELETE');
        expect(spec.paths[`/openapi/v1/{omadacId}${D}/multi-tabs/config`]?.patch).toBeTruthy();
        await operations.setDashboardTabs({ tabs: [{ id: 't1', cards: [101] }] }, 'site-9', { 'X-Request-ID': 'r1' });
        expectCall('multi-tabs/config', 'PATCH', { data: { tabs: [{ id: 't1', cards: [101] }] } });
    });

    it('rejects invalid input before sending', async () => {
        await expect(operations.getTopAps({ start: 5, end: 1 })).rejects.toThrow('start must be before end.');
        await expect(operations.getClientAppTraffic('nope', range)).rejects.toThrow('A valid MAC address is required.');
        await expect(operations.deleteDashboardTab(' ')).rejects.toThrow('An identifier is required.');
        await expect(operations.listMostActiveEapsByTraffic(0, range)).rejects.toThrow();
        await expect(operations.searchClientTraffic({ page: 1, pageSize: 500 })).rejects.toThrow();
        expect(request.request).not.toHaveBeenCalled();
    });
});
