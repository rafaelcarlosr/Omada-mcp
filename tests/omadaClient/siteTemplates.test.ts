import { readFileSync } from 'node:fs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { SiteTemplateOperations } from '../../src/omadaClient/siteTemplates.js';

const spec: { paths: Record<string, Record<string, unknown>> } = {
    paths: Object.assign(
        {},
        ...['02-organization', '09-site-network-template-setting'].map(
            (name) =>
                JSON.parse(readFileSync(new URL(`../../docs/openapi/${name}.json`, import.meta.url), 'utf8')).paths as Record<
                    string,
                    Record<string, unknown>
                >
        )
    ),
};

type Ops = InstanceType<typeof SiteTemplateOperations>;
const site = {
    siteTemplateId: 't1',
    name: 's',
    region: 'Brazil',
    scenario: 'General',
    deviceAccountSetting: { username: 'a', password: 'Aa1!Zx8wQe4Rt6Yu' },
};

const cases: { method: keyof Ops; args: unknown[]; http: string; route: string; url: string; data?: unknown; params?: unknown }[] = [
    { method: 'listSiteTemplateModules', args: [], http: 'GET', route: '/sitetemplates/modules', url: '/sitetemplates/modules' },
    { method: 'listSiteTemplateAllModules', args: [], http: 'GET', route: '/sitetemplates/all-modules', url: '/sitetemplates/all-modules' },
    {
        method: 'getSiteTemplateSpecification',
        args: ['t1'],
        http: 'GET',
        route: '/sitetemplates/{siteTemplateId}/specification',
        url: '/sitetemplates/t1/specification',
    },
    {
        method: 'getSiteTemplateCapacity',
        args: ['t1'],
        http: 'GET',
        route: '/sitetemplates/{siteTemplateId}/capacity',
        url: '/sitetemplates/t1/capacity',
    },
    {
        method: 'listSiteTemplateBoundSites',
        args: ['t1', 1, 10],
        http: 'GET',
        route: '/sitetemplates/{siteTemplateId}/binding-sites',
        url: '/sitetemplates/t1/binding-sites',
        params: { page: 1, pageSize: 10 },
    },
    {
        method: 'listSitesAvailableForTemplate',
        args: ['t1', 1, 10, 'lab'],
        http: 'GET',
        route: '/sitetemplates/{siteTemplateId}/available-bind',
        url: '/sitetemplates/t1/available-bind',
        params: { page: 1, pageSize: 10, searchKey: 'lab' },
    },
    {
        method: 'createSiteTemplate',
        args: [{ name: 'n', settings: ['log'] }],
        http: 'POST',
        route: '/sitetemplates',
        url: '/sitetemplates',
        data: { name: 'n', settings: ['log'] },
    },
    {
        method: 'renameSiteTemplate',
        args: ['t1', 'n'],
        http: 'PUT',
        route: '/sitetemplates/{siteTemplateId}',
        url: '/sitetemplates/t1',
        data: { name: 'n' },
    },
    { method: 'deleteSiteTemplate', args: ['t1'], http: 'DELETE', route: '/sitetemplates/{siteTemplateId}', url: '/sitetemplates/t1' },
    {
        method: 'copySiteTemplate',
        args: ['t1', 'n'],
        http: 'POST',
        route: '/sitetemplates/{siteTemplateId}/copy',
        url: '/sitetemplates/t1/copy',
        data: { name: 'n' },
    },
    { method: 'createSiteFromTemplate', args: [site], http: 'POST', route: '/sites/template', url: '/sites/template', data: site },
    {
        method: 'bindSiteToTemplate',
        args: ['t1', { siteId: 's1' }],
        http: 'POST',
        route: '/sitetemplates/{siteTemplateId}/bind-site',
        url: '/sitetemplates/t1/bind-site',
        data: { siteId: 's1' },
    },
    {
        method: 'unbindSitesFromTemplate',
        args: ['t1', ['s1']],
        http: 'POST',
        route: '/sitetemplates/{siteTemplateId}/batch-unbind',
        url: '/sitetemplates/t1/batch-unbind',
        data: { siteIds: ['s1'] },
    },
    {
        method: 'syncSitesWithTemplate',
        args: ['t1', ['s1']],
        http: 'POST',
        route: '/sitetemplates/{siteTemplateId}/multi-sites/sync',
        url: '/sitetemplates/t1/multi-sites/sync',
        data: { siteIds: ['s1'] },
    },
];

describe('omadaClient/siteTemplates', () => {
    const request = { request: vi.fn(), ensureSuccess: vi.fn((value: { result?: unknown }) => value.result) };
    const buildPath = vi.fn((path: string) => `/openapi/v1/cid${path}`);
    let operations: Ops;

    beforeEach(() => {
        vi.clearAllMocks();
        request.request.mockResolvedValue({ errorCode: 0, result: { ok: true } });
        operations = new SiteTemplateOperations(request as never, buildPath);
    });

    it.each(cases)('$method sends $http to $route', async ({ method, args, http, route, url, data, params }) => {
        expect(spec.paths[`/openapi/v1/{omadacId}${route}`]?.[http.toLowerCase()]).toBeTruthy();
        const fn = operations[method] as (...input: unknown[]) => Promise<unknown>;
        await expect(fn.call(operations, ...args, { 'X-Request-ID': 'r1' })).resolves.toEqual({ ok: true });
        expect(request.request).toHaveBeenCalledWith(
            { url: `/openapi/v1/cid${url}`, method: http, ...(data === undefined ? {} : { data }), ...(params === undefined ? {} : { params }) },
            true,
            { 'X-Request-ID': 'r1' }
        );
    });

    it('omits an empty search and rejects invalid input before sending', async () => {
        await operations.listSitesAvailableForTemplate('t1', 1, 10);
        expect(request.request).toHaveBeenLastCalledWith(
            { url: '/openapi/v1/cid/sitetemplates/t1/available-bind', method: 'GET', params: { page: 1, pageSize: 10 } },
            true,
            undefined
        );
        request.request.mockClear();
        await expect(operations.unbindSitesFromTemplate('t1', [])).rejects.toThrow('At least one site ID is required.');
        await expect(operations.deleteSiteTemplate(' ')).rejects.toThrow('An identifier is required.');
        await expect(operations.createSiteTemplate({ name: 'n', type: 1 } as never)).rejects.toThrow();
        expect(request.request).not.toHaveBeenCalled();
    });
});
