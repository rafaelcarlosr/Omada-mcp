import { readFileSync } from 'node:fs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AuthProfileOperations } from '../../src/omadaClient/authProfiles.js';

const spec = JSON.parse(readFileSync(new URL('../../docs/openapi/04.4-site-network-setting-profiles.json', import.meta.url), 'utf8')) as {
    paths: Record<string, Record<string, unknown>>;
};

type Ops = InstanceType<typeof AuthProfileOperations>;
const radius = {
    name: 'r',
    authServer: [{ radiusServerIp: '10.0.0.1', radiusPort: 1812, radiusPwd: 'lab-pw-1' }],
    radiusAccountingEnable: false,
    wirelessVlanAssignment: false,
};
const ldap = { name: 'l', status: true, bindType: 1, server: '10.0.0.2', dstPort: 389, useSsl: false, cn: 'uid', baseDn: 'dc=x' };
const user = { type: 0, userInfo: { username: 'u', password: 'lab-pw-2' } };

const cases: { method: keyof Ops; args: unknown[]; http: string; route: string; url: string; data?: unknown }[] = [
    { method: 'createRadiusProfile', args: [radius], http: 'POST', route: '/profiles/radius', url: '/profiles/radius', data: radius },
    {
        method: 'updateRadiusProfile',
        args: ['r1', radius],
        http: 'PATCH',
        route: '/profiles/radius/{radiusProfileId}',
        url: '/profiles/radius/r1',
        data: radius,
    },
    { method: 'deleteRadiusProfile', args: ['r1'], http: 'DELETE', route: '/profiles/radius/{radiusProfileId}', url: '/profiles/radius/r1' },
    { method: 'createLdapProfile', args: [ldap], http: 'POST', route: '/profiles/ldap', url: '/profiles/ldap', data: ldap },
    { method: 'updateLdapProfile', args: ['l1', ldap], http: 'PATCH', route: '/profiles/ldap/{ldapProfileId}', url: '/profiles/ldap/l1', data: ldap },
    { method: 'deleteLdapProfile', args: ['l1'], http: 'DELETE', route: '/profiles/ldap/{ldapProfileId}', url: '/profiles/ldap/l1' },
    {
        method: 'createRadiusUser',
        args: [user],
        http: 'POST',
        route: '/profiles/radius-server/users',
        url: '/profiles/radius-server/users',
        data: user,
    },
    {
        method: 'updateRadiusUser',
        args: ['u1', user],
        http: 'PATCH',
        route: '/profiles/radius-server/users/{userId}',
        url: '/profiles/radius-server/users/u1',
        data: user,
    },
    {
        method: 'deleteRadiusUser',
        args: ['u1'],
        http: 'DELETE',
        route: '/profiles/radius-server/users/{userId}',
        url: '/profiles/radius-server/users/u1',
    },
];

describe('omadaClient/authProfiles', () => {
    const request = { request: vi.fn(), ensureSuccess: vi.fn((value: { result?: unknown }) => value.result) };
    const site = { resolveSiteId: vi.fn(async (id?: string) => id ?? 's1') };
    let operations: Ops;

    beforeEach(() => {
        vi.clearAllMocks();
        request.request.mockResolvedValue({ errorCode: 0, result: { ok: true } });
        operations = new AuthProfileOperations(request as never, site as never, (path) => `/openapi/v1/cid${path}`);
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
        await expect(operations.createRadiusProfile({ ...radius, unexpected: 1 } as never)).rejects.toThrow();
        await expect(operations.createLdapProfile({ name: 'l' } as never)).rejects.toThrow();
        await expect(operations.deleteRadiusUser(' ')).rejects.toThrow('An identifier is required.');
        expect(request.request).not.toHaveBeenCalled();
    });
});
