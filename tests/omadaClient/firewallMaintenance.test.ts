import { readFileSync } from 'node:fs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { FirewallMaintenanceOperations } from '../../src/omadaClient/firewallMaintenance.js';

const spec = JSON.parse(readFileSync(new URL('../../docs/openapi/04.6-site-network-setting-security.json', import.meta.url), 'utf8')) as {
    paths: Record<string, Record<string, unknown>>;
};

type Ops = InstanceType<typeof FirewallMaintenanceOperations>;
const acl = {
    status: true,
    description: 'a',
    direction: 1,
    policy: 0,
    protocol: 6,
    sourceList: ['10.0.0.1'],
    destinationList: ['1.1.1.1'],
    logStatus: false,
};

const cases: { method: keyof Ops; args: unknown[]; http: string; route: string; data?: unknown }[] = [
    { method: 'resetFirewallSetting', args: [], http: 'PATCH', route: '/firewall/reset', data: {} },
    { method: 'getAttackDefenseDefaults', args: [], http: 'GET', route: '/attack-defense/default' },
    { method: 'resetAttackDefenseSetting', args: [], http: 'PATCH', route: '/attack-defense/reset', data: {} },
    { method: 'listUrlFilterCategories', args: [], http: 'GET', route: '/url-filters/category' },
    {
        method: 'setUrlFilterGlobalSetting',
        args: [{ blockPage: false, safeSearch: true }],
        http: 'PATCH',
        route: '/url-filters/globalUrlFilter',
        data: { blockPage: false, safeSearch: true },
    },
    {
        method: 'reorderUrlFilterRules',
        args: ['ap', { a: 1, b: 2 }],
        http: 'PATCH',
        route: '/url-filters',
        data: { type: 'ap', indexes: { a: 1, b: 2 } },
    },
    { method: 'reorderAcls', args: ['switch', { a: 1 }], http: 'POST', route: '/acls/modifyIndex', data: { type: 'switch', indexes: { a: 1 } } },
    { method: 'clearGatewayAclHitCounts', args: [], http: 'POST', route: '/acls/osg-acls/hit-counts', data: {} },
    {
        method: 'updateGatewayCustomAcls',
        args: [{ adds: [{ ...acl, index: 1 }] }],
        http: 'PATCH',
        route: '/acls/osg-custom-acls',
        data: { adds: [{ ...acl, index: 1 }] },
    },
    {
        method: 'reorderGatewayCustomAcls',
        args: [{ a: 1 }],
        http: 'POST',
        route: '/acls/osg-custom-acls/modifyIndex',
        data: { type: 'gateway', indexes: { a: 1 } },
    },
    { method: 'clearGatewayCustomAclHitCounts', args: [], http: 'POST', route: '/acls/osg-custom-acls/hit-counts', data: {} },
    {
        method: 'setGatewayCustomAclsState',
        args: [['a'], 1, 2],
        http: 'POST',
        route: '/acls/gateway-acls/batch-edit',
        data: { ids: ['a'], selectType: 'include', status: 1, log: 2 },
    },
    {
        method: 'deleteGatewayCustomAcls',
        args: [['a']],
        http: 'POST',
        route: '/acls/gateway-acls/batch-delete',
        data: { ids: ['a'], selectType: 'include' },
    },
];

describe('omadaClient/firewallMaintenance', () => {
    const request = { request: vi.fn(), ensureSuccess: vi.fn((value: { result?: unknown }) => value.result) };
    const site = { resolveSiteId: vi.fn(async (id?: string) => id ?? 's1') };
    let operations: Ops;

    beforeEach(() => {
        vi.clearAllMocks();
        request.request.mockResolvedValue({ errorCode: 0, result: { ok: true } });
        operations = new FirewallMaintenanceOperations(request as never, site as never, (path) => `/openapi/v1/cid${path}`);
    });

    it.each(cases)('$method sends $http to $route', async ({ method, args, http, route, data }) => {
        expect(spec.paths[`/openapi/v1/{omadacId}/sites/{siteId}${route}`]?.[http.toLowerCase()]).toBeTruthy();
        const fn = operations[method] as (...input: unknown[]) => Promise<unknown>;
        await expect(fn.call(operations, ...args, 's1', { 'X-Request-ID': 'r1' })).resolves.toEqual({ ok: true });
        expect(request.request).toHaveBeenCalledWith(
            { url: `/openapi/v1/cid/sites/s1${route}`, method: http, ...(data === undefined ? {} : { data }) },
            true,
            { 'X-Request-ID': 'r1' }
        );
    });

    it('validates input before sending', async () => {
        await expect(operations.reorderAcls('wan' as never, { a: 1 })).rejects.toThrow();
        await expect(operations.reorderUrlFilterRules('gateway', {})).rejects.toThrow('At least one index is required.');
        await expect(operations.updateGatewayCustomAcls({})).rejects.toThrow('At least one custom ACL change is required.');
        await expect(operations.setGatewayCustomAclsState([], 0, 2)).rejects.toThrow('At least one ID is required.');
        await expect(operations.setGatewayCustomAclsState(['a'], 3 as never, 2)).rejects.toThrow();
        await expect(operations.deleteGatewayCustomAcls([])).rejects.toThrow();
        expect(request.request).not.toHaveBeenCalled();
    });
});
