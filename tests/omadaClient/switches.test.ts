import { readFileSync } from 'node:fs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Route tests use pass-through parsers; generated schema behaviour is covered in requestSchemas.test.ts.
const parsed: unknown[] = [];
vi.mock('../../src/omadaClient/requestSchemas.js', () => {
    const passthrough = {
        parse: (value: unknown) => {
            parsed.push(value);
            return value;
        },
        omit: () => passthrough,
    };
    return new Proxy({}, { get: (_target, key) => (key === 'then' ? undefined : passthrough), has: () => true });
});

const { SwitchOperations, healthRangeSchema } = await import('../../src/omadaClient/switches.js');

const specs: Record<string, { paths: Record<string, Record<string, unknown>> }> = Object.fromEntries(
    ['03-device', '15-insight'].map((name) => [name, JSON.parse(readFileSync(new URL(`../../docs/openapi/${name}.json`, import.meta.url), 'utf8'))])
);

const body = { marker: true };
const range = { start: 1000, end: 2000 };

type Ops = InstanceType<typeof SwitchOperations>;

const cases: { method: keyof Ops; args: unknown[]; http: string; spec: string; route: string; url: string; sendsBody: boolean }[] = [
    {
        method: 'getSwitchPortView',
        args: [],
        http: 'GET',
        spec: '03-device',
        route: '/switches/ports/switch-detail',
        url: '/switches/ports/switch-detail',
        sendsBody: false,
    },
    {
        method: 'getSwitchInterfacesBrief',
        args: ['AA-BB-CC-DD-EE-01'],
        http: 'GET',
        spec: '03-device',
        route: '/switches/{switchMac}/interfaces/brief',
        url: '/switches/AA-BB-CC-DD-EE-01/interfaces/brief',
        sendsBody: false,
    },
    {
        method: 'getSwitchExistingNetworks',
        args: ['AA-BB-CC-DD-EE-01'],
        http: 'GET',
        spec: '03-device',
        route: '/switches/{switchMac}/exist-network',
        url: '/switches/AA-BB-CC-DD-EE-01/exist-network',
        sendsBody: false,
    },
    {
        method: 'getSwitchDdmInfo',
        args: ['AA-BB-CC-DD-EE-01'],
        http: 'GET',
        spec: '03-device',
        route: '/switches/{switchMac}/ddm/info',
        url: '/switches/AA-BB-CC-DD-EE-01/ddm/info',
        sendsBody: false,
    },
    {
        method: 'getSwitchHealthDetail',
        args: ['AA-BB-CC-DD-EE-01', range],
        http: 'GET',
        spec: '15-insight',
        route: '/switches/{switchMac}/health/detail',
        url: '/switches/AA-BB-CC-DD-EE-01/health/detail?start=1000&end=2000',
        sendsBody: false,
    },
    {
        method: 'getSwitchHealthTimeline',
        args: ['AA-BB-CC-DD-EE-01', range],
        http: 'GET',
        spec: '15-insight',
        route: '/switches/{switchMac}/health/timeline',
        url: '/switches/AA-BB-CC-DD-EE-01/health/timeline?start=1000&end=2000',
        sendsBody: false,
    },
    {
        method: 'listSwitchPortTags',
        args: [],
        http: 'GET',
        spec: '03-device',
        route: '/switches/port-tag',
        url: '/switches/port-tag',
        sendsBody: false,
    },
    {
        method: 'createSwitchPortTag',
        args: [body],
        http: 'POST',
        spec: '03-device',
        route: '/switches/port-tag',
        url: '/switches/port-tag',
        sendsBody: true,
    },
    {
        method: 'updateSwitchPortTag',
        args: [body],
        http: 'PATCH',
        spec: '03-device',
        route: '/switches/port-tag',
        url: '/switches/port-tag',
        sendsBody: true,
    },
    {
        method: 'setSwitchGeneralConfig',
        args: ['AA-BB-CC-DD-EE-01', body],
        http: 'PATCH',
        spec: '03-device',
        route: '/switches/{switchMac}/general-config',
        url: '/switches/AA-BB-CC-DD-EE-01/general-config',
        sendsBody: true,
    },
    {
        method: 'cancelSwitchCableTest',
        args: ['AA-BB-CC-DD-EE-01'],
        http: 'POST',
        spec: '03-device',
        route: '/cable-test/switches/{switchMac}/cancel',
        url: '/cable-test/switches/AA-BB-CC-DD-EE-01/cancel',
        sendsBody: false,
    },
    {
        method: 'clearSwitchPortCounters',
        args: [body],
        http: 'POST',
        spec: '03-device',
        route: '/switches/multi-ports/clear-counters',
        url: '/switches/multi-ports/clear-counters',
        sendsBody: true,
    },
];

const listCases: { method: keyof Ops; args: unknown[]; spec: string; route: string; url: string }[] = [
    { method: 'listSwitchPortPoeInfo', args: [], spec: '03-device', route: '/switches/ports/poe-info', url: '/switches/ports/poe-info' },
    { method: 'listSwitchPortOverview', args: [], spec: '03-device', route: '/switches/ports/overview', url: '/switches/ports/overview' },
    { method: 'listSwitchPortCounters', args: [], spec: '03-device', route: '/switches/ports/counters', url: '/switches/ports/counters' },
    {
        method: 'listSwitchLldpNeighbors',
        args: ['AA-BB-CC-DD-EE-01'],
        spec: '03-device',
        route: '/switches/{switchMac}/lldp-neighbors',
        url: '/switches/AA-BB-CC-DD-EE-01/lldp-neighbors',
    },
    {
        method: 'listSwitchInterfaces',
        args: ['AA-BB-CC-DD-EE-01'],
        spec: '03-device',
        route: '/switches/{switchMac}/interfaces',
        url: '/switches/AA-BB-CC-DD-EE-01/interfaces',
    },
    {
        method: 'listSwitchPortLagNetworks',
        args: ['AA-BB-CC-DD-EE-01'],
        spec: '03-device',
        route: '/switches/{switchMac}/port-lag-networks',
        url: '/switches/AA-BB-CC-DD-EE-01/port-lag-networks',
    },
    {
        method: 'listSwitchNetworksDetail',
        args: ['AA-BB-CC-DD-EE-01'],
        spec: '03-device',
        route: '/switches/{switchMac}/networks-detail',
        url: '/switches/AA-BB-CC-DD-EE-01/networks-detail',
    },
    {
        method: 'listSwitchDhcpUsers',
        args: ['AA-BB-CC-DD-EE-01'],
        spec: '03-device',
        route: '/switches/{switchMac}/dhcp/user-list',
        url: '/switches/AA-BB-CC-DD-EE-01/dhcp/user-list',
    },
];

function documented(spec: string, route: string, http: string): boolean {
    return Boolean(specs[spec].paths[`/openapi/v1/{omadacId}/sites/{siteId}${route}`]?.[http.toLowerCase()]);
}

describe('omadaClient/switches', () => {
    const request = {
        request: vi.fn(),
        fetchPaginated: vi.fn(),
        ensureSuccess: vi.fn((value: { result?: unknown }) => value.result),
    };
    const site = { resolveSiteId: vi.fn(async (id?: string) => id ?? 'site-1') };
    const buildPath = vi.fn((path: string, version = 'v1') => `/openapi/${version}/cid${path}`);
    let operations: Ops;

    beforeEach(() => {
        vi.clearAllMocks();
        parsed.length = 0;
        request.request.mockResolvedValue({ errorCode: 0, result: { ok: true } });
        request.fetchPaginated.mockResolvedValue([{ id: 'x' }]);
        operations = new SwitchOperations(request as never, site as never, buildPath);
    });

    it.each(cases)('$method sends $http to the documented route', async ({ method, args, http, spec, route, url, sendsBody }) => {
        expect(documented(spec, route, http)).toBe(true);
        const fn = operations[method] as (...input: unknown[]) => Promise<unknown>;
        await expect(fn.call(operations, ...args, 'site-9', { 'X-Request-ID': 'r1' })).resolves.toEqual({ ok: true });
        const expectedUrl = `/openapi/v1/cid/sites/site-9${url}`;
        const expectedConfig = sendsBody ? { method: http, url: expectedUrl, data: body } : { method: http, url: expectedUrl };
        expect(request.request).toHaveBeenCalledWith(expectedConfig, true, { 'X-Request-ID': 'r1' });
        if (sendsBody) expect(parsed).toContain(body);
    });

    it.each(listCases)('$method reads every page of $route', async ({ method, args, spec, route, url }) => {
        expect(documented(spec, route, 'GET')).toBe(true);
        const fn = operations[method] as (...input: unknown[]) => Promise<unknown>;
        await expect(fn.call(operations, ...args, 'site-9', { 'X-Request-ID': 'r1' })).resolves.toEqual([{ id: 'x' }]);
        expect(request.fetchPaginated).toHaveBeenCalledWith(`/openapi/v1/cid/sites/site-9${url}`, {}, { 'X-Request-ID': 'r1' });
    });

    it('sends the port label id in the DELETE body', async () => {
        expect(documented('03-device', '/switches/port-tag', 'DELETE')).toBe(true);
        await operations.deleteSwitchPortTag('t-1');
        expect(request.request).toHaveBeenCalledWith(
            { method: 'DELETE', url: '/openapi/v1/cid/sites/site-1/switches/port-tag', data: { tagId: 't-1' } },
            true,
            undefined
        );
        await expect(operations.deleteSwitchPortTag('  ')).rejects.toThrow('An identifier is required.');
    });

    it('starts a cable test with the documented port list', async () => {
        expect(documented('03-device', '/cable-test/switches/{switchMac}/start', 'POST')).toBe(true);
        await operations.startSwitchCableTest('AA-BB-CC-DD-EE-01', [3, 4]);
        expect(request.request).toHaveBeenCalledWith(
            {
                method: 'POST',
                url: '/openapi/v1/cid/sites/site-1/cable-test/switches/AA-BB-CC-DD-EE-01/start',
                data: { portList: [{ port: 3 }, { port: 4 }] },
            },
            true,
            undefined
        );
        await expect(operations.startSwitchCableTest('AA-BB-CC-DD-EE-01', [])).rejects.toThrow();
    });

    it('rejects malformed MACs and health ranges before sending', async () => {
        await expect(operations.listSwitchLldpNeighbors('not-a-mac')).rejects.toThrow('A valid MAC address is required.');
        await expect(operations.getSwitchHealthDetail('AA-BB-CC-DD-EE-01', { start: 2000, end: 1000 })).rejects.toThrow('start must be before end');
        expect(() => healthRangeSchema.parse({ start: -1, end: 5 })).toThrow();
        expect(request.request).not.toHaveBeenCalled();
        expect(request.fetchPaginated).not.toHaveBeenCalled();
    });
});
