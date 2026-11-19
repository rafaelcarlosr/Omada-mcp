import { readFileSync } from 'node:fs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { SiteServiceOperations } from '../../src/omadaClient/siteServices.js';

const spec: { paths: Record<string, Record<string, unknown>> } = {
    paths: Object.assign(
        {},
        ...[
            '04.2-site-network-setting-general',
            '04.3-site-network-setting-network',
            '05-site-device-config',
            '04.1-site-network-setting-authentication',
            '18-intelli-recover',
        ].map(
            (name) =>
                JSON.parse(readFileSync(new URL(`../../docs/openapi/${name}.json`, import.meta.url), 'utf8')).paths as Record<
                    string,
                    Record<string, unknown>
                >
        )
    ),
};

type Ops = InstanceType<typeof SiteServiceOperations>;

const poe = { name: 'night', status: true, turnOnTime: 'tr-1', poePortsMap: { 'AA-BB-CC-DD-EE-01': [2] } };
const bind = { ip: '192.168.0.50', mac: 'AA-BB-CC-00-11-22', status: true, interfaceType: 1, interfaceId: 'lan-1' };
const iot = {
    name: 'beacons',
    enable: false,
    serverUrl: 'http://192.0.2.10/iot',
    serverType: 0,
    deviceClasses: [1],
    authentication: 0,
    accessToken: 'tok123456',
    clientId: 'cid1',
    rssiFormat: 0,
    blePeriodicTelemetry: false,
    rawData: false,
};
const mail = { sender: 'a@example.com', receiver: 'b@example.com', ssl: false, auth: false };
const speed = { autoSpeedTest: true, timingType: 1, hour: 3, minute: 0 };
const radio = { enable: true, agingTime: 60, format: 0 };
const recover = { autoFlag: true, limitNum: 3 };

const cases: { method: keyof Ops; args: unknown[]; http: string; route: string; url: string; body?: unknown }[] = [
    { method: 'createPoeSchedule', args: [poe], http: 'POST', route: '/poe-schedules', url: '/poe-schedules', body: poe },
    { method: 'updatePoeSchedule', args: ['p 1', poe], http: 'PUT', route: '/poe-schedules/{poeScheduleId}', url: '/poe-schedules/p%201', body: poe },
    { method: 'deletePoeSchedule', args: ['p1'], http: 'DELETE', route: '/poe-schedules/{poeScheduleId}', url: '/poe-schedules/p1' },
    { method: 'createIpMacBinding', args: [bind], http: 'POST', route: '/ip-mac-binds', url: '/ip-mac-binds', body: bind },
    { method: 'updateIpMacBinding', args: ['b1', bind], http: 'PATCH', route: '/ip-mac-binds/{bindId}', url: '/ip-mac-binds/b1', body: bind },
    { method: 'deleteIpMacBinding', args: ['b1'], http: 'DELETE', route: '/ip-mac-binds/{bindId}', url: '/ip-mac-binds/b1' },
    { method: 'createIotServer', args: [iot], http: 'POST', route: '/setting/iot/servers', url: '/setting/iot/servers', body: iot },
    { method: 'updateIotServer', args: ['i1', iot], http: 'PUT', route: '/setting/iot/servers/{id}', url: '/setting/iot/servers/i1', body: iot },
    { method: 'deleteIotServer', args: ['i1'], http: 'DELETE', route: '/setting/iot/servers/{id}', url: '/setting/iot/servers/i1' },
    { method: 'getSiteMailServer', args: [], http: 'GET', route: '/setting/mails', url: '/setting/mails' },
    { method: 'createSiteMailServer', args: [mail], http: 'POST', route: '/setting/mails', url: '/setting/mails', body: mail },
    { method: 'updateSiteMailServer', args: ['m1', mail], http: 'PATCH', route: '/setting/mails/{mailId}', url: '/setting/mails/m1', body: mail },
    { method: 'setSiteLed', args: [{ enable: false }], http: 'PUT', route: '/led', url: '/led', body: { enable: false } },
    {
        method: 'setMulticastRateLimit',
        args: [{ mcastRateLimit: { enable: true } }],
        http: 'PATCH',
        route: '/multicast-rate-limit',
        url: '/multicast-rate-limit',
        body: { mcastRateLimit: { enable: true } },
    },
    {
        method: 'setSiteRememberSetting',
        args: [{ remember: true }],
        http: 'POST',
        route: '/remember-device',
        url: '/remember-device',
        body: { remember: true },
    },
    { method: 'getMldSetting', args: [], http: 'GET', route: '/setting/service/mld', url: '/setting/service/mld' },
    { method: 'getSpeedTestSetting', args: [], http: 'GET', route: '/setting/speedTest', url: '/setting/speedTest' },
    { method: 'setSpeedTestSetting', args: [speed], http: 'POST', route: '/setting/speedTest', url: '/setting/speedTest', body: speed },
    { method: 'getPortalLogoutSetting', args: [], http: 'GET', route: '/portal-logout', url: '/portal-logout' },
    {
        method: 'setPortalLogoutSetting',
        args: [{ domain: 'x.example.com' }],
        http: 'PUT',
        route: '/portal-logout',
        url: '/portal-logout',
        body: { domain: 'x.example.com' },
    },
    { method: 'listPortalsWithLogout', args: [], http: 'GET', route: '/portals/logout-enabled', url: '/portals/logout-enabled' },
    { method: 'getIotRadioSetting', args: [], http: 'GET', route: '/setting/iot/radio', url: '/setting/iot/radio' },
    { method: 'setIotRadioSetting', args: [radio], http: 'PATCH', route: '/setting/iot/radio', url: '/setting/iot/radio', body: radio },
    {
        method: 'getIntelliRecoverSetting',
        args: [],
        http: 'GET',
        route: '/intelli-recover/auto-setting/config',
        url: '/intelli-recover/auto-setting/config',
    },
    {
        method: 'setIntelliRecoverSetting',
        args: [recover],
        http: 'POST',
        route: '/intelli-recover/auto-setting/modify',
        url: '/intelli-recover/auto-setting/modify',
        body: recover,
    },
];

describe('omadaClient/siteServices', () => {
    const request = { request: vi.fn(), fetchPaginated: vi.fn(), ensureSuccess: vi.fn((value: { result?: unknown }) => value.result) };
    const site = { resolveSiteId: vi.fn(async (id?: string) => id ?? 'site-1') };
    const buildPath = vi.fn((path: string, version = 'v1') => `/openapi/${version}/cid${path}`);
    let operations: Ops;

    beforeEach(() => {
        vi.clearAllMocks();
        request.request.mockResolvedValue({ errorCode: 0, result: { ok: true } });
        request.fetchPaginated.mockResolvedValue([{ id: 'x' }]);
        operations = new SiteServiceOperations(request as never, site as never, buildPath);
    });

    it.each(cases)('$method sends $http to the documented route', async ({ method, args, http, route, url, body }) => {
        expect(spec.paths[`/openapi/v1/{omadacId}/sites/{siteId}${route}`]?.[http.toLowerCase()]).toBeTruthy();
        const fn = operations[method] as (...input: unknown[]) => Promise<unknown>;
        await expect(fn.call(operations, ...args, 'site-9', { 'X-Request-ID': 'r1' })).resolves.toEqual({ ok: true });
        const expectedUrl = `/openapi/v1/cid/sites/site-9${url}`;
        expect(request.request).toHaveBeenCalledWith(
            body === undefined ? { method: http, url: expectedUrl } : { method: http, url: expectedUrl, data: body },
            true,
            { 'X-Request-ID': 'r1' }
        );
    });

    it('reads every page of the IoT transport streams', async () => {
        expect(spec.paths['/openapi/v1/{omadacId}/sites/{siteId}/setting/iot/servers']?.get).toBeTruthy();
        await expect(operations.listIotServers()).resolves.toEqual([{ id: 'x' }]);
        expect(request.fetchPaginated).toHaveBeenCalledWith('/openapi/v1/cid/sites/site-1/setting/iot/servers', {}, undefined);
    });

    it('rejects blank ids, read-only fields and malformed port maps before sending', async () => {
        await expect(operations.deletePoeSchedule(' ')).rejects.toThrow('An identifier is required.');
        await expect(operations.createPoeSchedule({ ...poe, siteId: 's' } as never)).rejects.toThrow();
        await expect(operations.createPoeSchedule({ ...poe, poePortsMap: { mac: ['1'] } } as never)).rejects.toThrow();
        await expect(operations.createSiteMailServer({ ...mail, id: 'm' } as never)).rejects.toThrow();
        await expect(operations.setIotRadioSetting({ ...radio, resource: 0 } as never)).rejects.toThrow();
        await expect(operations.createIpMacBinding({ ...bind, supportExport: true } as never)).rejects.toThrow();
        await expect(operations.setIntelliRecoverSetting({ id: 'x' } as never)).rejects.toThrow();
        await expect(operations.setIntelliRecoverSetting({ limitNum: 2 })).rejects.toThrow();
        expect(request.request).not.toHaveBeenCalled();
    });
});
