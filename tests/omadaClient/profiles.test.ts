import { readFileSync } from 'node:fs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
    bonjourServicePayloadSchema,
    ouiProfilePayloadSchema,
    ProfileOperations,
    serviceTypePayloadSchema,
    wifiCallingCopySchema,
    wifiCallingProfilePayloadSchema,
} from '../../src/omadaClient/profiles.js';

const spec: { paths: Record<string, Record<string, unknown>> } = {
    paths: Object.assign(
        {},
        ...['04.3-site-network-setting-network', '04.4-site-network-setting-profiles', '04.7-site-network-setting-transmission'].map(
            (name) =>
                JSON.parse(readFileSync(new URL(`../../docs/openapi/${name}.json`, import.meta.url), 'utf8')).paths as Record<
                    string,
                    Record<string, unknown>
                >
        )
    ),
};

type Ops = InstanceType<typeof ProfileOperations>;

const rateLimit = { name: 'guests', downLimitEnable: true, downLimit: 1000, upLimitEnable: false };
const serviceType = { name: 'web', protocol: 0, sourceStartPort: 0, sourceEndPort: 65535, destStartPort: 80, destEndPort: 81 };
const bonjour = { name: 'printers', serviceIds: ['_ipp._tcp.local'] };
const apn = { name: 'carrier', pdpType: 0, apnType: 0, apn: 'internet', authentication: 0 };
const wifiCalling = { name: 'voice', carrierList: [{ carrierName: 'C', epdgs: [{ qosPriority: 1, type: 1, ip: '192.0.2.1' }] }] };
const oui = { name: 'phones', ouiCombine: [{ oui: '00-1B-63' }] };

const cases: { method: keyof Ops; args: unknown[]; http: string; route: string; url: string; body?: unknown }[] = [
    {
        method: 'createRateLimitProfile',
        args: [rateLimit],
        http: 'POST',
        route: '/rate-limit-profiles',
        url: '/rate-limit-profiles',
        body: rateLimit,
    },
    {
        method: 'updateRateLimitProfile',
        args: ['p 1', rateLimit],
        http: 'PUT',
        route: '/rate-limit-profile/{profileId}',
        url: '/rate-limit-profile/p%201',
        body: rateLimit,
    },
    { method: 'deleteRateLimitProfile', args: ['p1'], http: 'DELETE', route: '/rate-limit-profile/{profileId}', url: '/rate-limit-profile/p1' },
    {
        method: 'createServiceType',
        args: [serviceType],
        http: 'POST',
        route: '/profiles/service-type',
        url: '/profiles/service-type',
        body: serviceType,
    },
    {
        method: 'updateServiceType',
        args: ['s1', serviceType],
        http: 'PUT',
        route: '/profiles/service-type/{id}',
        url: '/profiles/service-type/s1',
        body: serviceType,
    },
    { method: 'deleteServiceType', args: ['s1'], http: 'DELETE', route: '/profiles/service-type/{id}', url: '/profiles/service-type/s1' },
    {
        method: 'createMdnsProfile',
        args: [bonjour],
        http: 'POST',
        route: '/profiles/bonjour-service',
        url: '/profiles/bonjour-service',
        body: bonjour,
    },
    {
        method: 'updateMdnsProfile',
        args: ['b1', bonjour],
        http: 'PUT',
        route: '/profiles/bonjour-service/{id}',
        url: '/profiles/bonjour-service/b1',
        body: bonjour,
    },
    { method: 'deleteMdnsProfile', args: ['b1'], http: 'DELETE', route: '/profiles/bonjour-service/{id}', url: '/profiles/bonjour-service/b1' },
    { method: 'listApnProfiles', args: [], http: 'GET', route: '/profiles/apn', url: '/profiles/apn' },
    { method: 'createApnProfile', args: [apn], http: 'POST', route: '/profiles/apn', url: '/profiles/apn', body: apn },
    { method: 'updateApnProfile', args: ['a1', apn], http: 'PUT', route: '/profiles/apn/{profileId}', url: '/profiles/apn/a1', body: apn },
    { method: 'deleteApnProfile', args: ['a1'], http: 'DELETE', route: '/profiles/apn/{profileId}', url: '/profiles/apn/a1' },
    { method: 'listWifiCallingProfiles', args: [], http: 'GET', route: '/profiles/wifi-calling', url: '/profiles/wifi-calling' },
    {
        method: 'createWifiCallingProfile',
        args: [wifiCalling],
        http: 'POST',
        route: '/profiles/wifi-calling',
        url: '/profiles/wifi-calling',
        body: wifiCalling,
    },
    {
        method: 'copyWifiCallingProfile',
        args: ['w1', { name: 'copy' }],
        http: 'POST',
        route: '/profiles/wifi-calling/{profileId}/copy',
        url: '/profiles/wifi-calling/w1/copy',
        body: { name: 'copy' },
    },
    {
        method: 'updateWifiCallingProfile',
        args: ['w1', wifiCalling],
        http: 'PATCH',
        route: '/profiles/wifi-calling/{profileId}',
        url: '/profiles/wifi-calling/w1',
        body: wifiCalling,
    },
    {
        method: 'deleteWifiCallingProfile',
        args: ['w1'],
        http: 'DELETE',
        route: '/profiles/wifi-calling/{profileId}',
        url: '/profiles/wifi-calling/w1',
    },
    { method: 'listOuiProfileSummaries', args: [], http: 'GET', route: '/oui-profiles/all', url: '/oui-profiles/all' },
    { method: 'createOuiProfile', args: [oui], http: 'POST', route: '/oui-profiles', url: '/oui-profiles', body: oui },
    { method: 'updateOuiProfile', args: ['o1', oui], http: 'PUT', route: '/oui-profiles/{ouiId}', url: '/oui-profiles/o1', body: oui },
    { method: 'deleteOuiProfile', args: ['o1'], http: 'DELETE', route: '/oui-profiles/{ouiId}', url: '/oui-profiles/o1' },
    {
        method: 'listSwitchOuiRuleSwitches',
        args: [2, 5],
        http: 'GET',
        route: '/switch-oui-rules/switches',
        url: '/switch-oui-rules/switches?page=2&pageSize=5',
    },
    {
        method: 'listSwitchOuiSupportedSwitches',
        args: [1, 10],
        http: 'GET',
        route: '/switch-oui-rules/support-device',
        url: '/switch-oui-rules/support-device?page=1&pageSize=10',
    },
    {
        method: 'listSwitchOuiAutoAddVlanSwitches',
        args: [1, 10],
        http: 'GET',
        route: '/switch-oui-rules/switches/support-auto-add-vlan',
        url: '/switch-oui-rules/switches/support-auto-add-vlan?page=1&pageSize=10',
    },
    {
        method: 'getSwitchOuiAutoAddVlan',
        args: [],
        http: 'GET',
        route: '/switch-oui-rules/whether-auto-add-vlan',
        url: '/switch-oui-rules/whether-auto-add-vlan',
    },
    {
        method: 'getSwitchOuiAutoAddVlanAllSupport',
        args: [],
        http: 'GET',
        route: '/switch-oui-rules/auto-add-vlan-all-support',
        url: '/switch-oui-rules/auto-add-vlan-all-support',
    },
];

describe('omadaClient/profiles', () => {
    const request = { request: vi.fn(), fetchPaginated: vi.fn(), ensureSuccess: vi.fn((value: { result?: unknown }) => value.result) };
    const site = { resolveSiteId: vi.fn(async (id?: string) => id ?? 'site-1') };
    const buildPath = vi.fn((path: string, version = 'v1') => `/openapi/${version}/cid${path}`);
    let operations: Ops;

    beforeEach(() => {
        vi.clearAllMocks();
        request.request.mockResolvedValue({ errorCode: 0, result: { ok: true } });
        request.fetchPaginated.mockResolvedValue([{ id: 'x' }]);
        operations = new ProfileOperations(request as never, site as never, buildPath);
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

    it.each([
        ['listSwitchOuiRules', '/switch-oui-rules'],
        ['listSwitchOuiValidVlans', '/switch-oui-rules/valid-vlans'],
    ] as const)('%s reads every page', async (method, route) => {
        expect(spec.paths[`/openapi/v1/{omadacId}/sites/{siteId}${route}`]?.get).toBeTruthy();
        await expect(operations[method]()).resolves.toEqual([{ id: 'x' }]);
        expect(request.fetchPaginated).toHaveBeenCalledWith(`/openapi/v1/cid/sites/site-1${route}`, {}, undefined);
    });

    it('rejects blank ids and invalid bodies before sending', async () => {
        await expect(operations.deleteApnProfile(' ')).rejects.toThrow('An identifier is required.');
        await expect(operations.createRateLimitProfile({ ...rateLimit, extra: 1 } as never)).rejects.toThrow();
        expect(request.request).not.toHaveBeenCalled();
    });

    describe('payload schemas', () => {
        it('keeps only the fields of the service type protocol', () => {
            expect(serviceTypePayloadSchema.parse({ name: 'ping', protocol: 3, type: 8, code: 0 })).toEqual({
                name: 'ping',
                protocol: 3,
                type: 8,
                code: 0,
            });
            expect(serviceTypePayloadSchema.parse({ name: 'gre', protocol: 4, protoNum: 47 })).toEqual({ name: 'gre', protocol: 4, protoNum: 47 });
            expect(() => serviceTypePayloadSchema.parse({ name: 'ping', protocol: 3, type: 8, code: 0, destStartPort: 1 })).toThrow(
                'destStartPort does not apply to protocol 3.'
            );
            expect(() => serviceTypePayloadSchema.parse({ name: 'web', protocol: 0, destStartPort: 80 })).toThrow(
                'sourceStartPort is required for protocol 0.'
            );
            expect(() => serviceTypePayloadSchema.parse({ name: 'x', protocol: 9 })).toThrow('protocol must be 0 TCP');
        });

        it('accepts real Bonjour service IDs, up to three', () => {
            expect(bonjourServicePayloadSchema.parse({ name: 'a', serviceIds: ['_airplay._tcp.local'] })).toBeTruthy();
            expect(() => bonjourServicePayloadSchema.parse({ name: 'a', serviceIds: ['airplay'] })).toThrow('_airplay._tcp.local');
            expect(() =>
                bonjourServicePayloadSchema.parse({ name: 'a', serviceIds: ['_a._b.local', '_c._d.local', '_e._f.local', '_g._h.local'] })
            ).toThrow();
        });

        it('requires Wi-Fi calling names', () => {
            expect(() => wifiCallingProfilePayloadSchema.parse({ carrierList: [] })).toThrow();
            expect(() => wifiCallingCopySchema.parse({ name: '' })).toThrow();
            expect(wifiCallingCopySchema.parse({ name: 'copy' })).toEqual({ name: 'copy' });
        });

        it('upper-cases OUIs and validates their format', () => {
            expect(ouiProfilePayloadSchema.parse({ name: 'p', ouiCombine: [{ oui: 'aa-bb-cc', description: 'x' }] })).toEqual({
                name: 'p',
                ouiCombine: [{ oui: 'AA-BB-CC', description: 'x' }],
            });
            expect(ouiProfilePayloadSchema.parse({ name: 'p' })).toEqual({ name: 'p' });
            expect(() => ouiProfilePayloadSchema.parse({ name: 'p', ouiCombine: [{ oui: 'AABBCC' }] })).toThrow('00-1B-63');
        });
    });
});
