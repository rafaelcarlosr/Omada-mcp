import { readFileSync } from 'node:fs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { NetworkSecurityOperations } from '../../src/omadaClient/networkSecurity.js';

const spec = JSON.parse(readFileSync(new URL('../../docs/openapi/04.6-site-network-setting-security.json', import.meta.url), 'utf8')) as {
    paths: Record<string, Record<string, unknown>>;
};

type Ops = InstanceType<typeof NetworkSecurityOperations>;
const NS = '/network-security';

const cases: { method: keyof Ops; args: unknown[]; http: string; route: string; url: string; data?: unknown }[] = [
    { method: 'getWirelessIdsConfig', args: [], http: 'GET', route: `${NS}/wireless-ids`, url: `${NS}/wireless-ids` },
    {
        method: 'setWirelessIdsConfig',
        args: [{ status: true, level: 1 }],
        http: 'PUT',
        route: `${NS}/wireless-ids`,
        url: `${NS}/wireless-ids`,
        data: { status: true, level: 1 },
    },
    { method: 'getWirelessIpsConfig', args: [], http: 'GET', route: `${NS}/wireless-ips`, url: `${NS}/wireless-ips` },
    {
        method: 'setWirelessIpsConfig',
        args: [{ status: false, deauthEn: false, dynamicEn: false }],
        http: 'PUT',
        route: `${NS}/wireless-ips`,
        url: `${NS}/wireless-ips`,
        data: { status: false, deauthEn: false, dynamicEn: false },
    },
    {
        method: 'createIpsAllowEntry',
        args: [{ direction: 0, trafficType: 0, ipAddress: '10.0.0.1' }],
        http: 'POST',
        route: `${NS}/ips/allow-list`,
        url: `${NS}/ips/allow-list`,
        data: { direction: 0, trafficType: 0, ipAddress: '10.0.0.1' },
    },
    {
        method: 'updateIpsAllowEntry',
        args: [{ id: 'a1', direction: 1, trafficType: 0, ipAddress: '10.0.0.1' }],
        http: 'PATCH',
        route: `${NS}/ips/allow-list`,
        url: `${NS}/ips/allow-list`,
        data: { id: 'a1', direction: 1, trafficType: 0, ipAddress: '10.0.0.1' },
    },
    { method: 'deleteIpsAllowEntry', args: ['a1'], http: 'DELETE', route: `${NS}/ips/allow-list/{entryId}`, url: `${NS}/ips/allow-list/a1` },
    { method: 'deleteIpsBlockEntry', args: ['b1'], http: 'DELETE', route: `${NS}/ips/block-list/{entryId}`, url: `${NS}/ips/block-list/b1` },
    {
        method: 'updateIpsSignature',
        args: ['g1', { type: 0 }],
        http: 'PATCH',
        route: `${NS}/ips/signature/{signId}`,
        url: `${NS}/ips/signature/g1`,
        data: { type: 0 },
    },
    { method: 'deleteIpsSignature', args: ['g1'], http: 'DELETE', route: `${NS}/ips/signature/{signId}`, url: `${NS}/ips/signature/g1` },
];

describe('omadaClient/networkSecurity', () => {
    const request = { request: vi.fn(), ensureSuccess: vi.fn((value: { result?: unknown }) => value.result) };
    const site = { resolveSiteId: vi.fn(async (id?: string) => id ?? 's1') };
    let operations: Ops;

    beforeEach(() => {
        vi.clearAllMocks();
        request.request.mockResolvedValue({ errorCode: 0, result: { ok: true } });
        operations = new NetworkSecurityOperations(request as never, site as never, (path) => `/openapi/v1/cid${path}`);
    });

    it.each(cases)('$method sends $http to $route', async ({ method, args, http, route, url, data }) => {
        expect(spec.paths[`/openapi/v1/{omadacId}/sites/{siteId}${route}`]?.[http.toLowerCase()]).toBeTruthy();
        const fn = operations[method] as (...input: unknown[]) => Promise<unknown>;
        await expect(fn.call(operations, ...args, 's1', { 'X-Request-ID': 'r1' })).resolves.toEqual({ ok: true });
        expect(request.request).toHaveBeenCalledWith(
            { url: `/openapi/v1/cid/sites/s1${url}`, method: http, ...(data === undefined ? {} : { data }) },
            true,
            { 'X-Request-ID': 'r1' }
        );
    });

    it('validates bodies and identifiers before sending', async () => {
        await expect(operations.setWirelessIdsConfig({ status: true } as never)).rejects.toThrow();
        await expect(operations.updateIpsSignature('g1', {} as never)).rejects.toThrow();
        await expect(operations.deleteIpsBlockEntry(' ')).rejects.toThrow('An identifier is required.');
        expect(request.request).not.toHaveBeenCalled();
    });
});
