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

const { VpnOperations } = await import('../../src/omadaClient/vpn.js');

const specs: Record<string, { paths: Record<string, Record<string, unknown>> }> = Object.fromEntries(
    ['04.8-site-network-setting-vpn', '15-insight'].map((name) => [
        name,
        JSON.parse(readFileSync(new URL(`../../docs/openapi/${name}.json`, import.meta.url), 'utf8')),
    ])
);

const body = { marker: true };

type Ops = InstanceType<typeof VpnOperations>;

const cases: {
    method: keyof Ops;
    args: unknown[];
    http: string;
    spec: string;
    route: string; // documented path suffix after /sites/{siteId}
    url: string; // concrete suffix
    version: string;
    sendsBody: boolean;
}[] = [
    {
        method: 'createVpnUser',
        args: [body],
        http: 'POST',
        spec: '04.8-site-network-setting-vpn',
        route: '/vpn/users',
        url: '/vpn/users',
        version: 'v3',
        sendsBody: true,
    },
    {
        method: 'updateVpnUser',
        args: ['u1', body],
        http: 'PATCH',
        spec: '04.8-site-network-setting-vpn',
        route: '/vpn/users/{userId}',
        url: '/vpn/users/u1',
        version: 'v3',
        sendsBody: true,
    },
    {
        method: 'deleteVpnUser',
        args: ['u1'],
        http: 'DELETE',
        spec: '04.8-site-network-setting-vpn',
        route: '/vpn/users/{userId}',
        url: '/vpn/users/u1',
        version: 'v1',
        sendsBody: false,
    },
    {
        method: 'createSslVpnResource',
        args: [body],
        http: 'POST',
        spec: '04.8-site-network-setting-vpn',
        route: '/vpn/ssl-vpn-server/resources',
        url: '/vpn/ssl-vpn-server/resources',
        version: 'v1',
        sendsBody: true,
    },
    {
        method: 'updateSslVpnResource',
        args: ['r1', body],
        http: 'PUT',
        spec: '04.8-site-network-setting-vpn',
        route: '/vpn/ssl-vpn-server/resources/{id}',
        url: '/vpn/ssl-vpn-server/resources/r1',
        version: 'v1',
        sendsBody: true,
    },
    {
        method: 'deleteSslVpnResource',
        args: ['r1'],
        http: 'DELETE',
        spec: '04.8-site-network-setting-vpn',
        route: '/vpn/ssl-vpn-server/resources/{id}',
        url: '/vpn/ssl-vpn-server/resources/r1',
        version: 'v1',
        sendsBody: false,
    },
    {
        method: 'createSslVpnResourceGroup',
        args: [body],
        http: 'POST',
        spec: '04.8-site-network-setting-vpn',
        route: '/vpn/ssl-vpn-server/resource-groups',
        url: '/vpn/ssl-vpn-server/resource-groups',
        version: 'v1',
        sendsBody: true,
    },
    {
        method: 'updateSslVpnResourceGroup',
        args: ['g1', body],
        http: 'PUT',
        spec: '04.8-site-network-setting-vpn',
        route: '/vpn/ssl-vpn-server/resource-groups/{id}',
        url: '/vpn/ssl-vpn-server/resource-groups/g1',
        version: 'v1',
        sendsBody: true,
    },
    {
        method: 'deleteSslVpnResourceGroup',
        args: ['g1'],
        http: 'DELETE',
        spec: '04.8-site-network-setting-vpn',
        route: '/vpn/ssl-vpn-server/resource-groups/{id}',
        url: '/vpn/ssl-vpn-server/resource-groups/g1',
        version: 'v1',
        sendsBody: false,
    },
    {
        method: 'createSslVpnUserGroup',
        args: [body],
        http: 'POST',
        spec: '04.8-site-network-setting-vpn',
        route: '/vpn/ssl-vpn-server/user-groups',
        url: '/vpn/ssl-vpn-server/user-groups',
        version: 'v1',
        sendsBody: true,
    },
    {
        method: 'updateSslVpnUserGroup',
        args: ['ug1', body],
        http: 'PUT',
        spec: '04.8-site-network-setting-vpn',
        route: '/vpn/ssl-vpn-server/user-groups/{id}',
        url: '/vpn/ssl-vpn-server/user-groups/ug1',
        version: 'v1',
        sendsBody: true,
    },
    {
        method: 'deleteSslVpnUserGroup',
        args: ['ug1'],
        http: 'DELETE',
        spec: '04.8-site-network-setting-vpn',
        route: '/vpn/ssl-vpn-server/user-groups/{id}',
        url: '/vpn/ssl-vpn-server/user-groups/ug1',
        version: 'v1',
        sendsBody: false,
    },
    {
        method: 'createSslVpnLock',
        args: [body],
        http: 'POST',
        spec: '04.8-site-network-setting-vpn',
        route: '/vpn/ssl-vpn-server/locked-users',
        url: '/vpn/ssl-vpn-server/locked-users',
        version: 'v1',
        sendsBody: true,
    },
    {
        method: 'updateSslVpnLock',
        args: ['l1', body],
        http: 'PUT',
        spec: '04.8-site-network-setting-vpn',
        route: '/vpn/ssl-vpn-server/locked-users/{id}',
        url: '/vpn/ssl-vpn-server/locked-users/l1',
        version: 'v1',
        sendsBody: true,
    },
    {
        method: 'deleteSslVpnLock',
        args: ['l1'],
        http: 'DELETE',
        spec: '04.8-site-network-setting-vpn',
        route: '/vpn/ssl-vpn-server/locked-users/{id}',
        url: '/vpn/ssl-vpn-server/locked-users/l1',
        version: 'v1',
        sendsBody: false,
    },
    {
        method: 'getEoGreTunnelConfig',
        args: [],
        http: 'GET',
        spec: '04.8-site-network-setting-vpn',
        route: '/vpn/gre-tunnel',
        url: '/vpn/gre-tunnel',
        version: 'v1',
        sendsBody: false,
    },
    {
        method: 'setEoGreTunnelConfig',
        args: [body],
        http: 'PUT',
        spec: '04.8-site-network-setting-vpn',
        route: '/vpn/gre-tunnel',
        url: '/vpn/gre-tunnel',
        version: 'v1',
        sendsBody: true,
    },
];

const listCases: {
    method: keyof Ops;
    args: unknown[];
    spec: string;
    route: string;
    url: string;
    version: string;
    params: Record<string, unknown>;
}[] = [
    { method: 'listVpnUsers', args: [], spec: '04.8-site-network-setting-vpn', route: '/vpn/users', url: '/vpn/users', version: 'v2', params: {} },
    {
        method: 'listSslVpnResources',
        args: [],
        spec: '04.8-site-network-setting-vpn',
        route: '/vpn/ssl-vpn-server/resources',
        url: '/vpn/ssl-vpn-server/resources',
        version: 'v1',
        params: {},
    },
    {
        method: 'listSslVpnResourceGroups',
        args: [],
        spec: '04.8-site-network-setting-vpn',
        route: '/vpn/ssl-vpn-server/resource-groups',
        url: '/vpn/ssl-vpn-server/resource-groups',
        version: 'v1',
        params: {},
    },
    {
        method: 'listSslVpnUserGroups',
        args: [],
        spec: '04.8-site-network-setting-vpn',
        route: '/vpn/ssl-vpn-server/user-groups',
        url: '/vpn/ssl-vpn-server/user-groups',
        version: 'v1',
        params: {},
    },
    {
        method: 'listSslVpnUserGroupUsers',
        args: ['ug1'],
        spec: '04.8-site-network-setting-vpn',
        route: '/vpn/usergroups/{userGroupId}/users',
        url: '/vpn/usergroups/ug1/users',
        version: 'v2',
        params: {},
    },
    {
        method: 'listSslVpnLocks',
        args: [],
        spec: '04.8-site-network-setting-vpn',
        route: '/vpn/ssl-vpn-server/locked-users',
        url: '/vpn/ssl-vpn-server/locked-users',
        version: 'v1',
        params: {},
    },
    {
        method: 'listVpnServerStatus',
        args: [3, undefined],
        spec: '15-insight',
        route: '/setting/vpn/stats/server',
        url: '/setting/vpn/stats/server',
        version: 'v1',
        params: { 'filters.vpnType': 3 },
        pageSize: 100,
    },
    {
        method: 'listVpnServerStatus',
        args: [5, 1],
        spec: '15-insight',
        route: '/setting/vpn/stats/server',
        url: '/setting/vpn/stats/server',
        version: 'v1',
        params: { 'filters.vpnType': 5, 'filters.clientMode': 1 },
        pageSize: 100,
    },
    {
        method: 'listVpnServerClientStatus',
        args: ['vpn1'],
        spec: '15-insight',
        route: '/setting/vpn/stats/server/{vpnId}/client',
        url: '/setting/vpn/stats/server/vpn1/client',
        version: 'v1',
        params: {},
        pageSize: 100,
    },
    {
        method: 'listVpnClientStatus',
        args: [4],
        spec: '15-insight',
        route: '/setting/vpn/stats/client',
        url: '/setting/vpn/stats/client',
        version: 'v1',
        params: { 'filters.vpnType': 4 },
        pageSize: 100,
    },
    {
        method: 'listSiteToSiteVpnStatus',
        args: [2],
        spec: '15-insight',
        route: '/setting/vpn/stats/s2s',
        url: '/setting/vpn/stats/s2s',
        version: 'v1',
        params: { 'filters.vpnType': 2 },
        pageSize: 100,
    },
    {
        method: 'listSiteToSiteVpnPeerStatus',
        args: ['vpn1'],
        spec: '15-insight',
        route: '/setting/vpn/stats/s2s/{vpnId}/peer',
        url: '/setting/vpn/stats/s2s/vpn1/peer',
        version: 'v1',
        params: {},
        pageSize: 100,
    },
];

function documented(spec: string, version: string, route: string, http: string): boolean {
    return Boolean(specs[spec].paths[`/openapi/${version}/{omadacId}/sites/{siteId}${route}`]?.[http.toLowerCase()]);
}

describe('omadaClient/vpn', () => {
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
        operations = new VpnOperations(request as never, site as never, buildPath);
    });

    it.each(cases)('$method sends $http to the documented route', async ({ method, args, http, spec, route, url, version, sendsBody }) => {
        expect(documented(spec, version, route, http)).toBe(true);

        const fn = operations[method] as (...input: unknown[]) => Promise<unknown>;
        await expect(fn.call(operations, ...args, 'site-9', { 'X-Request-ID': 'r1' })).resolves.toEqual({ ok: true });

        const expectedUrl = `/openapi/${version}/cid/sites/site-9${url}`;
        const expectedConfig = sendsBody ? { method: http, url: expectedUrl, data: body } : { method: http, url: expectedUrl };
        expect(request.request).toHaveBeenCalledWith(expectedConfig, true, { 'X-Request-ID': 'r1' });
        if (sendsBody) expect(parsed).toContain(body);
    });

    it.each(listCases)('$method reads every page of $route', async ({ method, args, spec, route, url, version, params, pageSize }) => {
        expect(documented(spec, version, route, 'GET')).toBe(true);
        const fn = operations[method] as (...input: unknown[]) => Promise<unknown>;
        await expect(fn.call(operations, ...args, 'site-9', { 'X-Request-ID': 'r1' })).resolves.toEqual([{ id: 'x' }]);
        expect(request.fetchPaginated).toHaveBeenCalledWith(`/openapi/${version}/cid/sites/site-9${url}`, params, { 'X-Request-ID': 'r1' }, pageSize);
    });

    it('rejects blank identifiers and unsupported status filters before sending', async () => {
        await expect(operations.deleteVpnUser('  ')).rejects.toThrow('An identifier is required.');
        await expect(operations.listVpnServerStatus(6, undefined)).rejects.toThrow();
        await expect(operations.listVpnServerStatus(0, 2)).rejects.toThrow();
        await expect(operations.listVpnClientStatus(1.5)).rejects.toThrow();
        expect(request.request).not.toHaveBeenCalled();
        expect(request.fetchPaginated).not.toHaveBeenCalled();
    });

    it('encodes identifiers into a single path segment and defaults the site', async () => {
        await operations.deleteSslVpnLock('a/b');
        expect(request.request).toHaveBeenCalledWith(
            { method: 'DELETE', url: '/openapi/v1/cid/sites/site-1/vpn/ssl-vpn-server/locked-users/a%2Fb' },
            true,
            undefined
        );
    });

    it('propagates controller rejections from ensureSuccess', async () => {
        request.ensureSuccess.mockImplementationOnce(() => {
            throw new Error('Invalid password.');
        });
        await expect(operations.updateVpnUser('u1', body as never)).rejects.toThrow('Invalid password.');
    });
});
