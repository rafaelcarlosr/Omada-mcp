import { readFileSync } from 'node:fs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { GlobalSecurityOperations } from '../../src/omadaClient/globalSecurity.js';

const spec = JSON.parse(readFileSync(new URL('../../docs/openapi/22-global-security.json', import.meta.url), 'utf8')) as {
    paths: Record<string, Record<string, unknown>>;
};

type Ops = InstanceType<typeof GlobalSecurityOperations>;

const cases: { method: keyof Ops; args: unknown[]; http: string; route: string; data: unknown }[] = [
    { method: 'getThreatMap', args: [{ start: 1, end: 2 }], http: 'POST', route: '/security/threat-map', data: { start: 1, end: 2 } },
    {
        method: 'getThreatCategoryCounts',
        args: [{ start: 1, end: 2, sites: 's1' }],
        http: 'POST',
        route: '/security/threat-map/threat-count',
        data: { start: 1, end: 2, sites: 's1' },
    },
    {
        method: 'listCountryThreats',
        args: [{ country: 'KP', currentPage: 1 }],
        http: 'POST',
        route: '/security/threat-map/threats',
        data: { country: 'KP', currentPage: 1 },
    },
    { method: 'listBlockedCountries', args: [['s1', 's2']], http: 'POST', route: '/security/blocked-country', data: { sites: 's1,s2' } },
    { method: 'listBlockedCountries', args: [undefined], http: 'POST', route: '/security/blocked-country', data: {} },
    { method: 'blockCountry', args: ['KP', ['s1']], http: 'POST', route: '/security/blocked-country/add', data: { country: 'KP', sites: ['s1'] } },
    { method: 'unblockCountry', args: ['KP', ['s1']], http: 'DELETE', route: '/security/blocked-country', data: { country: 'KP', sites: ['s1'] } },
];

describe('omadaClient/globalSecurity', () => {
    const request = { request: vi.fn(), ensureSuccess: vi.fn((value: { result?: unknown }) => value.result) };
    let operations: Ops;

    beforeEach(() => {
        vi.clearAllMocks();
        request.request.mockResolvedValue({ errorCode: 0, result: { ok: true } });
        operations = new GlobalSecurityOperations(request as never, (path) => `/openapi/v1/cid${path}`);
    });

    it.each(cases)('$method sends $http to $route', async ({ method, args, http, route, data }) => {
        expect(spec.paths[`/openapi/v1/{omadacId}${route}`]?.[http.toLowerCase()]).toBeTruthy();
        const fn = operations[method] as (...input: unknown[]) => Promise<unknown>;
        await expect(fn.call(operations, ...args, { 'X-Request-ID': 'r1' })).resolves.toEqual({ ok: true });
        expect(request.request).toHaveBeenCalledWith({ url: `/openapi/v1/cid${route}`, method: http, data }, true, { 'X-Request-ID': 'r1' });
    });

    it('validates country codes and sites before sending', async () => {
        await expect(operations.blockCountry('korea', ['s1'])).rejects.toThrow('ISO 3166-1 alpha-2');
        await expect(operations.unblockCountry('KP', [])).rejects.toThrow('At least one site ID is required.');
        await expect(operations.getThreatMap({ start: 'x' } as never)).rejects.toThrow();
        expect(request.request).not.toHaveBeenCalled();
    });
});
