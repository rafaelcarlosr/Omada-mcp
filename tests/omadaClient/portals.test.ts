import { readFileSync } from 'node:fs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { PortalOperations } from '../../src/omadaClient/portals.js';

const paths: Record<string, Record<string, unknown>> = Object.assign(
    {},
    ...['04.1-site-network-setting-authentication', '04.2-site-network-setting-general', '04.4-site-network-setting-profiles'].map(
        (name) => JSON.parse(readFileSync(new URL(`../../docs/openapi/${name}.json`, import.meta.url), 'utf8')).paths
    )
);

type Ops = InstanceType<typeof PortalOperations>;
const portal = {
    name: 'p',
    enable: true,
    authType: 0,
    authTimeout: { customTimeout: 2, customTimeoutUnit: 2 },
    httpsRedirectEnable: false,
    landingPage: 1,
    portalCustomize: { defaultLanguage: 0, copyrightEnable: false, logoDisplay: false, termsOfServiceEnable: false, welcomeEnable: false },
};
const profile = { profileName: 'pp', autoCreatePsks: false, ppsk: [{ name: 'a', psk: 'labpsk12345' }] };
const v1profile = { profileName: 'pp', ppsk: [{ name: 'a', psk: 'labpsk12345' }] };

const cases: { method: keyof Ops; args: unknown[]; http: string; version: string; route: string; url: string; data?: unknown }[] = [
    { method: 'getPortal', args: ['p1'], http: 'GET', version: 'v1', route: '/portal/{portalId}', url: '/portal/p1' },
    {
        method: 'getPortalCustomization',
        args: ['p1'],
        http: 'GET',
        version: 'v1',
        route: '/portal/{portalId}/customization',
        url: '/portal/p1/customization',
    },
    { method: 'getPortalDomain', args: [], http: 'GET', version: 'v1', route: '/portal/setting/domain', url: '/portal/setting/domain' },
    { method: 'createPortal', args: [portal], http: 'POST', version: 'v1', route: '/portal', url: '/portal', data: portal },
    { method: 'updatePortal', args: ['p1', portal], http: 'PATCH', version: 'v1', route: '/portal/{portalId}', url: '/portal/p1', data: portal },
    { method: 'deletePortal', args: ['p1'], http: 'DELETE', version: 'v1', route: '/portal/{portalId}', url: '/portal/p1' },
    { method: 'createPpskProfile', args: [profile], http: 'POST', version: 'v2', route: '/ppsk-profile', url: '/ppsk-profile', data: profile },
    {
        method: 'updatePpskProfile',
        args: ['k1', v1profile],
        http: 'POST',
        version: 'v1',
        route: '/ppsk-profile/{profileId}',
        url: '/ppsk-profile/k1',
        data: v1profile,
    },
    { method: 'deletePpskProfile', args: ['k1'], http: 'DELETE', version: 'v1', route: '/ppsk-profile/{profileId}', url: '/ppsk-profile/k1' },
    {
        method: 'addPpskEntries',
        args: ['k1', { ppskList: [{ name: 'b', psk: 'labpsk67890' }] }],
        http: 'POST',
        version: 'v1',
        route: '/ppsk-profile/{profileId}/add-psk',
        url: '/ppsk-profile/k1/add-psk',
        data: { ppskList: [{ name: 'b', psk: 'labpsk67890' }] },
    },
    {
        method: 'deletePpskEntries',
        args: ['k1', ['b']],
        http: 'POST',
        version: 'v1',
        route: '/ppsk-profile/{profileId}/delete-psk',
        url: '/ppsk-profile/k1/delete-psk',
        data: { ppskNameList: ['b'] },
    },
    { method: 'listRebootSchedules', args: [], http: 'GET', version: 'v1', route: '/reboot-schedules', url: '/reboot-schedules' },
];

describe('omadaClient/portals', () => {
    const request = { request: vi.fn(), ensureSuccess: vi.fn((value: { result?: unknown }) => value.result) };
    const site = { resolveSiteId: vi.fn(async (id?: string) => id ?? 's1') };
    let operations: Ops;

    beforeEach(() => {
        vi.clearAllMocks();
        request.request.mockResolvedValue({ errorCode: 0, result: { ok: true } });
        operations = new PortalOperations(request as never, site as never, (path, version = 'v1') => `/openapi/${version}/cid${path}`);
    });

    it.each(cases)('$method sends $http to $route', async ({ method, args, http, version, route, url, data }) => {
        expect(paths[`/openapi/${version}/{omadacId}/sites/{siteId}${route}`]?.[http.toLowerCase()]).toBeTruthy();
        const fn = operations[method] as (...input: unknown[]) => Promise<unknown>;
        await expect(fn.call(operations, ...args, 's1', { 'X-Request-ID': 'r1' })).resolves.toEqual({ ok: true });
        expect(request.request).toHaveBeenCalledWith(
            { url: `/openapi/${version}/cid/sites/s1${url}`, method: http, ...(data === undefined ? {} : { data }) },
            true,
            { 'X-Request-ID': 'r1' }
        );
    });

    it('validates bodies and identifiers before sending', async () => {
        await expect(operations.createPortal({ name: 'p' } as never)).rejects.toThrow();
        await expect(operations.deletePpskEntries('k1', [])).rejects.toThrow('At least one PSK name is required.');
        await expect(operations.deletePortal(' ')).rejects.toThrow('An identifier is required.');
        expect(request.request).not.toHaveBeenCalled();
    });
});
