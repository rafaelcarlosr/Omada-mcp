import { readFileSync } from 'node:fs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { MonitoringOperations } from '../../src/omadaClient/monitoring.js';

const spec: { paths: Record<string, Record<string, unknown>> } = {
    paths: Object.assign(
        {},
        ...['13-monitor', '15-insight', '17-incident-detect'].map(
            (name) =>
                JSON.parse(readFileSync(new URL(`../../docs/openapi/${name}.json`, import.meta.url), 'utf8')).paths as Record<
                    string,
                    Record<string, unknown>
                >
        )
    ),
};

type Ops = InstanceType<typeof MonitoringOperations>;
const range = { startTime: 100, endTime: 200 };
const filterRange = { 'filters.startTime': 100, 'filters.endTime': 200 };
const MAC = 'AA-BB-CC-DD-EE-01';
const tab = { name: 'Ops', status: 1, cardGroupList: [{ cardGroupName: 'traffic', cardList: ['internet'] }] };

const cases: { method: keyof Ops; args: unknown[]; http: string; route: string; url: string; data?: unknown; params?: unknown }[] = [
    {
        method: 'listAnomalyIncidents',
        args: [range, 1, 10, { status: 0, category: 'link', anomalyCode: 'c' }],
        http: 'GET',
        route: '/anomaly/incidents',
        url: '/anomaly/incidents',
        params: { page: 1, pageSize: 10, ...filterRange, 'filters.status': 0, 'filters.category': 'link', 'filters.anomalyCode': 'c' },
    },
    { method: 'getAnomalyIncident', args: ['i1'], http: 'GET', route: '/anomaly/incident/{incidentId}', url: '/anomaly/incident/i1' },
    { method: 'getUnresolvedIncidentCount', args: [], http: 'GET', route: '/anomaly/unresolved-incidents', url: '/anomaly/unresolved-incidents' },
    {
        method: 'getAnomalyStatistics',
        args: [range],
        http: 'GET',
        route: '/anomaly/overview/statistics',
        url: '/anomaly/overview/statistics',
        params: filterRange,
    },
    {
        method: 'getAnomalyIncidentDistribution',
        args: [range],
        http: 'GET',
        route: '/anomaly/overview/incident-distribution',
        url: '/anomaly/overview/incident-distribution',
        params: filterRange,
    },
    {
        method: 'getAnomalyCategoryIncidents',
        args: [range, 11],
        http: 'GET',
        route: '/anomaly/category',
        url: '/anomaly/category',
        params: { ...filterRange, category: 11 },
    },
    {
        method: 'listInfluencingDevices',
        args: [MAC, 'c', 1, 10],
        http: 'GET',
        route: '/anomaly/{mac}/influencing-devices',
        url: `/anomaly/${MAC}/influencing-devices`,
        params: { anomalyCode: 'c', page: 1, pageSize: 10 },
    },
    {
        method: 'listInfluencingClients',
        args: [MAC, 'c', 1, 10],
        http: 'GET',
        route: '/anomaly/{mac}/influencing-clients',
        url: `/anomaly/${MAC}/influencing-clients`,
        params: { anomalyCode: 'c', page: 1, pageSize: 10 },
    },
    {
        method: 'listDeviceIncidents',
        args: [MAC, range, 1, 10],
        http: 'GET',
        route: '/incident/{mac}',
        url: `/incident/${MAC}`,
        params: { page: 1, pageSize: 10, ...filterRange },
    },
    {
        method: 'listStackIncidents',
        args: ['st1', range, 1, 10],
        http: 'GET',
        route: '/incident/stack/{stackId}',
        url: '/incident/stack/st1',
        params: { page: 1, pageSize: 10, ...filterRange },
    },
    {
        method: 'getIncidentRanking',
        args: [{ ...range, anomalyCode: 1 }],
        http: 'POST',
        route: '/anomaly/overview/ranking-cards',
        url: '/anomaly/overview/ranking-cards',
        data: { ...range, anomalyCode: 1 },
    },
    {
        method: 'getIncidentObjectRanking',
        args: [{ ...range, anomalyCode: 1 }],
        http: 'POST',
        route: '/anomaly/incidents/ranking-cards',
        url: '/anomaly/incidents/ranking-cards',
        data: { ...range, anomalyCode: 1 },
    },
    {
        method: 'setIncidentStatus',
        args: [['i1'], 1],
        http: 'POST',
        route: '/anomaly/incident/status',
        url: '/anomaly/incident/status',
        data: { incidents: ['i1'], selectAll: false, targetStatus: 1 },
    },
    {
        method: 'deleteIncidents',
        args: [['i1']],
        http: 'DELETE',
        route: '/anomaly/incident',
        url: '/anomaly/incident',
        data: { incidents: ['i1'], selectAll: false },
    },
    {
        method: 'listAnomalySettings',
        args: [1, 10],
        http: 'GET',
        route: '/anomaly/setting',
        url: '/anomaly/setting',
        params: { page: 1, pageSize: 10 },
    },
    {
        method: 'setAnomalyEventSetting',
        args: [{ anomalyCode: 'c', enable: true }],
        http: 'PATCH',
        route: '/anomaly/setting/modify',
        url: '/anomaly/setting/modify',
        data: { anomalyCode: 'c', enable: true },
    },
    { method: 'getAnomalyNotificationSetting', args: [], http: 'GET', route: '/anomaly/notification', url: '/anomaly/notification' },
    {
        method: 'setAnomalyNotification',
        args: [{ alertEmailSetting: { delayEnable: true }, email: { eventLevel: {}, eventObjectType: {}, eventCategory: {} } }],
        http: 'PATCH',
        route: '/anomaly/notification',
        url: '/anomaly/notification',
        data: { alertEmailSetting: { delayEnable: true }, email: { eventLevel: {}, eventObjectType: {}, eventCategory: {} } },
    },
    {
        method: 'getWifiHealthTimeline',
        args: [range],
        http: 'GET',
        route: '/wifi/health/timeline',
        url: '/wifi/health/timeline',
        params: { start: 100, end: 200 },
    },
    {
        method: 'getWifiSubHealthTimeline',
        args: [range],
        http: 'GET',
        route: '/wifi/sub/health/timeline',
        url: '/wifi/sub/health/timeline',
        params: { start: 100, end: 200 },
    },
    {
        method: 'getApHealthDetail',
        args: [MAC, range],
        http: 'GET',
        route: '/eaps/{apMac}/health/detail',
        url: `/eaps/${MAC}/health/detail`,
        params: { start: 100, end: 200 },
    },
    {
        method: 'getApHealthTimeline',
        args: [MAC, range],
        http: 'GET',
        route: '/eaps/{apMac}/health/timeline',
        url: `/eaps/${MAC}/health/timeline`,
        params: { start: 100, end: 200 },
    },
    {
        method: 'listWifiHealthTopClients',
        args: [100, 5, 'ab'],
        http: 'POST',
        route: '/wifi/health/client/list',
        url: '/wifi/health/client/list',
        data: { time: 100, topK: 5, searchKey: 'ab' },
    },
    { method: 'listReportTabs', args: [], http: 'GET', route: '/report/allTabs', url: '/report/allTabs' },
    { method: 'getReportTab', args: ['t1'], http: 'GET', route: '/report/{tabId}', url: '/report/t1' },
    { method: 'createReportTab', args: [tab], http: 'POST', route: '/report/tab', url: '/report/tab', data: { ...tab, type: 1 } },
    { method: 'updateReportTab', args: ['t1', tab], http: 'PUT', route: '/report/tab', url: '/report/tab', data: { ...tab, tabId: 't1', type: 1 } },
    {
        method: 'deleteReportTabs',
        args: [['t1', 't2']],
        http: 'DELETE',
        route: '/report/tab/{tabIds}',
        url: `/report/tab/${encodeURIComponent('["t1","t2"]')}`,
    },
];

describe('omadaClient/monitoring', () => {
    const request = { request: vi.fn(), ensureSuccess: vi.fn((value: { result?: unknown }) => value.result) };
    const site = { resolveSiteId: vi.fn(async (id?: string) => id ?? 'site-1') };
    const buildPath = vi.fn((path: string) => `/openapi/v1/cid${path}`);
    let operations: Ops;

    beforeEach(() => {
        vi.clearAllMocks();
        request.request.mockResolvedValue({ errorCode: 0, result: { ok: true } });
        operations = new MonitoringOperations(request as never, site as never, buildPath);
    });

    it.each(cases)('$method sends $http to $route', async ({ method, args, http, route, url, data, params }) => {
        expect(spec.paths[`/openapi/v1/{omadacId}/sites/{siteId}${route}`]?.[http.toLowerCase()]).toBeTruthy();
        const fn = operations[method] as (...input: unknown[]) => Promise<unknown>;
        await expect(fn.call(operations, ...args)).resolves.toEqual({ ok: true });
        expect(request.request).toHaveBeenCalledWith(
            {
                url: `/openapi/v1/cid/sites/site-1${url}`,
                method: http,
                ...(data === undefined ? {} : { data }),
                ...(params === undefined ? {} : { params }),
            },
            true,
            undefined
        );
    });

    it('omits unset incident filters and the empty search key', async () => {
        await operations.listAnomalyIncidents(range, 1, 10);
        expect(request.request).toHaveBeenLastCalledWith(
            { url: '/openapi/v1/cid/sites/site-1/anomaly/incidents', method: 'GET', params: { page: 1, pageSize: 10, ...filterRange } },
            true,
            undefined
        );
        await operations.listWifiHealthTopClients(1, 5);
        expect(request.request).toHaveBeenLastCalledWith(
            { url: '/openapi/v1/cid/sites/site-1/wifi/health/client/list', method: 'POST', data: { time: 1, topK: 5 } },
            true,
            undefined
        );
    });

    it('rejects invalid input before sending', async () => {
        await expect(operations.getAnomalyStatistics({ startTime: 5, endTime: 1 })).rejects.toThrow('startTime must be before endTime.');
        await expect(operations.setIncidentStatus([], 1)).rejects.toThrow();
        await expect(operations.setIncidentStatus(['i1'], 3)).rejects.toThrow();
        await expect(operations.deleteIncidents([])).rejects.toThrow();
        await expect(operations.getApHealthDetail('nope', range)).rejects.toThrow('A valid MAC address is required.');
        await expect(operations.deleteReportTabs([])).rejects.toThrow();
        await expect(operations.getAnomalyCategoryIncidents(range, 5)).rejects.toThrow();
        await expect(operations.listWifiHealthTopClients(1, 100)).rejects.toThrow();
        expect(request.request).not.toHaveBeenCalled();
    });
});
