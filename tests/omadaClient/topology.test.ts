import { readFileSync } from 'node:fs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { TopologyOperations } from '../../src/omadaClient/topology.js';

const spec = JSON.parse(readFileSync(new URL('../../docs/openapi/00-all.json', import.meta.url), 'utf8')) as {
    paths: Record<string, Record<string, unknown>>;
};

type Ops = InstanceType<typeof TopologyOperations>;
const SW = 'AA-BB-CC-DD-EE-01';

const cases: { method: keyof Ops; args: unknown[]; http: string; version: string; route: string; url: string; data?: unknown; params?: unknown }[] = [
    { method: 'getSiteTopology', args: [], http: 'GET', version: 'v2', route: '/topology', url: '/topology' },
    {
        method: 'getSiteTopologyByStatus',
        args: ['0,1'],
        http: 'GET',
        version: 'v3',
        route: '/topology',
        url: '/topology',
        params: { 'filters.deviceStatus': '0,1' },
    },
    { method: 'refreshTopology', args: [], http: 'POST', version: 'v2', route: '/topology', url: '/topology' },
    { method: 'listTopologyNodes', args: [], http: 'GET', version: 'v2', route: '/topology/nodes', url: '/topology/nodes' },
    {
        method: 'setTopologyRootNode',
        args: [{ type: 'switch', mac: SW, discoveryMode: 0 }],
        http: 'POST',
        version: 'v2',
        route: '/topology/nodes',
        url: '/topology/nodes',
        data: { type: 'switch', mac: SW, discoveryMode: 0 },
    },
    {
        method: 'listTopologyClientsOfDevices',
        args: [[SW], '1'],
        http: 'POST',
        version: 'v2',
        route: '/topology/devices/all-clients',
        url: '/topology/devices/all-clients',
        data: { deviceMacs: [{ mac: SW, filterType: '1' }] },
    },
    {
        method: 'listTopologyDeviceClients',
        args: [SW],
        http: 'GET',
        version: 'v2',
        route: '/topology/devices/{mac}/clients',
        url: `/topology/devices/${SW}/clients`,
    },
    {
        method: 'listTopologyDeviceAllClients',
        args: [SW, '0'],
        http: 'GET',
        version: 'v2',
        route: '/topology/devices/{mac}/all-clients',
        url: `/topology/devices/${SW}/all-clients`,
        params: { 'filters.type': '0' },
    },
    {
        method: 'getTopologyAvailableNetworks',
        args: [],
        http: 'GET',
        version: 'v2',
        route: '/topology/available-network',
        url: '/topology/available-network',
    },
    {
        method: 'getTopologyAvailableVlans',
        args: [],
        http: 'GET',
        version: 'v2',
        route: '/topology/available-vlans',
        url: '/topology/available-vlans',
    },
    {
        method: 'getTopologyDiscoveryStatus',
        args: [],
        http: 'GET',
        version: 'v2',
        route: '/topology/discovery/status',
        url: '/topology/discovery/status',
    },
    {
        method: 'listTopologyIsolatedDevices',
        args: [],
        http: 'GET',
        version: 'v2',
        route: '/topology/isolated-and-pre-config',
        url: '/topology/isolated-and-pre-config',
    },
    {
        method: 'listTopologyVlanDevices',
        args: ['n1', 10],
        http: 'GET',
        version: 'v3',
        route: '/topology/{networkId}/vlan/{vlan}/devices',
        url: '/topology/n1/vlan/10/devices',
    },
    {
        method: 'listTopologySsidDevices',
        args: ['s1'],
        http: 'GET',
        version: 'v3',
        route: '/topology/ssids/{ssidId}/devices',
        url: '/topology/ssids/s1/devices',
    },
    {
        method: 'listCaptureInterfaces',
        args: ['ap', SW],
        http: 'GET',
        version: 'v1',
        route: '/capture/device-type/{deviceType}/{deviceMac}/interfaces',
        url: `/capture/device-type/ap/${SW}/interfaces`,
    },
    {
        method: 'getCaptureStatus',
        args: ['switch', SW, 'req1'],
        http: 'GET',
        version: 'v1',
        route: '/capture/device-type/{deviceType}/{deviceMac}/{requestId}/status',
        url: `/capture/device-type/switch/${SW}/req1/status`,
    },
    { method: 'getLastCaptureDevice', args: [], http: 'GET', version: 'v1', route: '/capture/lastDevice', url: '/capture/lastDevice' },
    {
        method: 'getReportEmailSchedule',
        args: [],
        http: 'GET',
        version: 'v2',
        route: '/report/export-schedule-email',
        url: '/report/export-schedule-email',
    },
    {
        method: 'reorderReportTabs',
        args: [[{ tabId: 't1', rank: 1 }]],
        http: 'PUT',
        version: 'v1',
        route: '/report/reorder',
        url: '/report/reorder',
        data: [{ tabId: 't1', rank: 1 }],
    },
];

describe('omadaClient/topology', () => {
    const request = { request: vi.fn(), fetchPaginated: vi.fn(), ensureSuccess: vi.fn((value: { result?: unknown }) => value.result) };
    const site = { resolveSiteId: vi.fn(async (id?: string) => id ?? 's1') };
    let operations: Ops;

    beforeEach(() => {
        vi.clearAllMocks();
        request.request.mockResolvedValue({ errorCode: 0, result: { ok: true } });
        request.fetchPaginated.mockResolvedValue([{ id: 'x' }]);
        operations = new TopologyOperations(request as never, site as never, (path, version = 'v1') => `/openapi/${version}/cid${path}`);
    });

    it.each(cases)('$method sends $http to $route', async ({ method, args, http, version, route, url, data, params }) => {
        expect(spec.paths[`/openapi/${version}/{omadacId}/sites/{siteId}${route}`]?.[http.toLowerCase()]).toBeTruthy();
        const fn = operations[method] as (...input: unknown[]) => Promise<unknown>;
        await expect(fn.call(operations, ...args, 's1', { 'X-Request-ID': 'r1' })).resolves.toEqual({ ok: true });
        expect(request.request).toHaveBeenCalledWith(
            {
                url: `/openapi/${version}/cid/sites/s1${url}`,
                method: http,
                ...(data === undefined ? {} : { data }),
                ...(params === undefined ? {} : { params }),
            },
            true,
            { 'X-Request-ID': 'r1' }
        );
    });

    it('reads paged lookups as complete collections', async () => {
        await operations.listTopologyAvailableSsids('', 's1');
        await operations.searchTopology('ap', 's1');
        await operations.listCaptureCapableDevices('gateway', 's1');
        expect(request.fetchPaginated).toHaveBeenNthCalledWith(
            1,
            '/openapi/v2/cid/sites/s1/topology/available-ssids',
            { searchKey: '' },
            undefined,
            100
        );
        expect(request.fetchPaginated).toHaveBeenNthCalledWith(
            2,
            '/openapi/v2/cid/sites/s1/topology/search-device-client',
            { searchKey: 'ap' },
            undefined,
            100
        );
        expect(request.fetchPaginated).toHaveBeenNthCalledWith(
            3,
            '/openapi/v1/cid/sites/s1/capture/all-devices/device-type/gateway',
            {},
            undefined,
            100
        );
        for (const [version, route] of [
            ['v2', '/topology/available-ssids'],
            ['v2', '/topology/search-device-client'],
            ['v1', '/capture/all-devices/device-type/{deviceType}'],
        ]) {
            expect(spec.paths[`/openapi/${version}/{omadacId}/sites/{siteId}${route}`]?.get).toBeTruthy();
        }
    });

    it('queries several sites at controller level', async () => {
        await operations.getMultiSiteTopology(['a', 'b']);
        expect(request.request).toHaveBeenCalledWith(
            { url: '/openapi/v2/cid/topology/batch', method: 'POST', data: { siteIds: ['a', 'b'] } },
            true,
            undefined
        );
        expect(spec.paths['/openapi/v2/{omadacId}/topology/batch']?.post).toBeTruthy();
    });

    it('validates input before sending', async () => {
        await expect(operations.getSiteTopologyByStatus('2' as never)).rejects.toThrow();
        await expect(operations.listTopologyDeviceClients('not-a-mac')).rejects.toThrow('A valid MAC address is required.');
        await expect(operations.listTopologyVlanDevices('n1', 5000)).rejects.toThrow();
        await expect(operations.listCaptureCapableDevices('router' as never)).rejects.toThrow();
        await expect(operations.searchTopology('')).rejects.toThrow('searchKey is required.');
        await expect(operations.getMultiSiteTopology([])).rejects.toThrow('At least one site ID is required.');
        await expect(operations.reorderReportTabs([])).rejects.toThrow('At least one report tab is required.');
        await expect(operations.setTopologyRootNode({ type: 'router' } as never)).rejects.toThrow();
        expect(request.request).not.toHaveBeenCalled();
    });
});
