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
    };
    return new Proxy({}, { get: (_target, key) => (key === 'then' ? undefined : passthrough), has: () => true });
});

const { ApOperations } = await import('../../src/omadaClient/aps.js');

const spec: { paths: Record<string, Record<string, unknown>> } = {
    paths: Object.assign(
        {},
        ...['03-device', '15-insight'].map(
            (name) =>
                JSON.parse(readFileSync(new URL(`../../docs/openapi/${name}.json`, import.meta.url), 'utf8')).paths as Record<
                    string,
                    Record<string, unknown>
                >
        )
    ),
};
const body = { marker: true };

type Ops = InstanceType<typeof ApOperations>;

const cases: { method: keyof Ops; args: unknown[]; http: string; version: string; route: string; url: string; sendsBody: boolean }[] = [
    {
        method: 'getApAfcStatus',
        args: ['AA-BB-CC-DD-EE-02'],
        http: 'GET',
        version: 'v1',
        route: '/aps/{apMac}/afc',
        url: '/aps/AA-BB-CC-DD-EE-02/afc',
        sendsBody: false,
    },
    {
        method: 'getApLanTraffic',
        args: ['AA-BB-CC-DD-EE-02'],
        http: 'GET',
        version: 'v1',
        route: '/aps/{apMac}/lan-traffic-info',
        url: '/aps/AA-BB-CC-DD-EE-02/lan-traffic-info',
        sendsBody: false,
    },
    {
        method: 'getApInterferenceDetectionStatus',
        args: ['AA-BB-CC-DD-EE-02'],
        http: 'GET',
        version: 'v1',
        route: '/aps/{apMac}/full-channel-detect/status',
        url: '/aps/AA-BB-CC-DD-EE-02/full-channel-detect/status',
        sendsBody: false,
    },
    {
        method: 'getApL3Access',
        args: ['AA-BB-CC-DD-EE-02'],
        http: 'GET',
        version: 'v1',
        route: '/aps/{apMac}/l3access',
        url: '/aps/AA-BB-CC-DD-EE-02/l3access',
        sendsBody: false,
    },
    {
        method: 'getApLagConfig',
        args: ['AA-BB-CC-DD-EE-02'],
        http: 'GET',
        version: 'v1',
        route: '/aps/{apMac}/lag',
        url: '/aps/AA-BB-CC-DD-EE-02/lag',
        sendsBody: false,
    },
    {
        method: 'getApManagementWlan',
        args: ['AA-BB-CC-DD-EE-02'],
        http: 'GET',
        version: 'v1',
        route: '/aps/{apMac}/management-wlan',
        url: '/aps/AA-BB-CC-DD-EE-02/management-wlan',
        sendsBody: false,
    },
    {
        method: 'getApSsidOverrides',
        args: ['AA-BB-CC-DD-EE-02'],
        http: 'GET',
        version: 'v2',
        route: '/aps/{apMac}/override',
        url: '/aps/AA-BB-CC-DD-EE-02/override',
        sendsBody: false,
    },
    {
        method: 'setApSsidOverrides',
        args: ['AA-BB-CC-DD-EE-02', body],
        http: 'PATCH',
        version: 'v2',
        route: '/aps/{apMac}/override',
        url: '/aps/AA-BB-CC-DD-EE-02/override',
        sendsBody: true,
    },
    {
        method: 'getApRfScanResult',
        args: ['AA-BB-CC-DD-EE-02'],
        http: 'GET',
        version: 'v2',
        route: '/aps/{apMac}/rf-scan-result',
        url: '/aps/AA-BB-CC-DD-EE-02/rf-scan-result',
        sendsBody: false,
    },
    {
        method: 'startApRfScan',
        args: ['AA-BB-CC-DD-EE-02', body],
        http: 'POST',
        version: 'v2',
        route: '/aps/{apMac}/start-rf-scan',
        url: '/aps/AA-BB-CC-DD-EE-02/start-rf-scan',
        sendsBody: true,
    },
    { method: 'listLockToApAps', args: [], http: 'GET', version: 'v2', route: '/lockToAp/aps', url: '/lockToAp/aps', sendsBody: false },
];

describe('omadaClient/aps', () => {
    const request = { request: vi.fn(), fetchPaginated: vi.fn(), ensureSuccess: vi.fn((value: { result?: unknown }) => value.result) };
    const site = { resolveSiteId: vi.fn(async (id?: string) => id ?? 'site-1') };
    const buildPath = vi.fn((path: string, version = 'v1') => `/openapi/${version}/cid${path}`);
    let operations: Ops;

    beforeEach(() => {
        vi.clearAllMocks();
        parsed.length = 0;
        request.request.mockResolvedValue({ errorCode: 0, result: { ok: true } });
        request.fetchPaginated.mockResolvedValue([{ id: 'x' }]);
        operations = new ApOperations(request as never, site as never, buildPath);
    });

    it.each(cases)('$method sends $http to the documented route', async ({ method, args, http, version, route, url, sendsBody }) => {
        expect(spec.paths[`/openapi/${version}/{omadacId}/sites/{siteId}${route}`]?.[http.toLowerCase()]).toBeTruthy();
        const fn = operations[method] as (...input: unknown[]) => Promise<unknown>;
        await expect(fn.call(operations, ...args, 'site-9', { 'X-Request-ID': 'r1' })).resolves.toEqual({ ok: true });
        const expectedUrl = `/openapi/${version}/cid/sites/site-9${url}`;
        expect(request.request).toHaveBeenCalledWith(
            sendsBody ? { method: http, url: expectedUrl, data: body } : { method: http, url: expectedUrl },
            true,
            {
                'X-Request-ID': 'r1',
            }
        );
        if (sendsBody) expect(parsed).toContain(body);
    });

    it('reads every page of the AP port VLANs', async () => {
        expect(spec.paths['/openapi/v1/{omadacId}/sites/{siteId}/aps/{apMac}/port-vlans']?.get).toBeTruthy();
        await expect(operations.listApPortVlans('AA-BB-CC-DD-EE-02')).resolves.toEqual([{ id: 'x' }]);
        expect(request.fetchPaginated).toHaveBeenCalledWith('/openapi/v1/cid/sites/site-1/aps/AA-BB-CC-DD-EE-02/port-vlans', {}, undefined);
    });

    it('rejects malformed MACs before sending', async () => {
        await expect(operations.getApAfcStatus('nope')).rejects.toThrow('A valid MAC address is required.');
        expect(request.request).not.toHaveBeenCalled();
    });
});
