import { readFileSync } from 'node:fs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { authSurveyPayloadSchema, HotspotAdminOperations } from '../../src/omadaClient/hotspotAdmin.js';

const spec: { paths: Record<string, Record<string, unknown>> } = {
    paths: Object.assign(
        {},
        ...['07-hotspot', '04.1-site-network-setting-authentication', '04.4-site-network-setting-profiles'].map(
            (name) =>
                JSON.parse(readFileSync(new URL(`../../docs/openapi/${name}.json`, import.meta.url), 'utf8')).paths as Record<
                    string,
                    Record<string, unknown>
                >
        )
    ),
};

type Ops = InstanceType<typeof HotspotAdminOperations>;

const range = { start: 100, end: 200 };
const rangeParams = { 'filters.timeStart': 100, 'filters.timeEnd': 200 };
const groupRangeParams = { page: 1, pageSize: 1000, ...rangeParams };
const survey = { title: 't', name: 'n', note: 'x', authTimeout: { authTimeout: 2 }, cardList: [], published: false };
const S = '/sites/{siteId}/hotspot';

const cases: { method: keyof Ops; args: unknown[]; http: string; route: string; url: string; data?: unknown; params?: unknown }[] = [
    {
        method: 'getVoucherGroupDetail',
        args: ['g1', { page: 1, pageSize: 10, status: 0, searchKey: '12' }],
        http: 'GET',
        route: `${S}/voucher-groups/{groupId}`,
        url: '/hotspot/voucher-groups/g1',
        params: { page: 1, pageSize: 10, 'filters.status': 0, searchKey: '12' },
    },
    { method: 'getVoucher', args: ['v1'], http: 'GET', route: `${S}/vouchers/{id}`, url: '/hotspot/vouchers/v1' },
    {
        method: 'listVoucherGroupOptions',
        args: [1, 10],
        http: 'GET',
        route: `${S}/voucher-group-options`,
        url: '/hotspot/voucher-group-options',
        params: { page: 1, pageSize: 10 },
    },
    {
        method: 'getVoucherGroupConfigLimit',
        args: [],
        http: 'GET',
        route: `${S}/voucher-groups/config-limit`,
        url: '/hotspot/voucher-groups/config-limit',
    },
    {
        method: 'listVoucherCurrencies',
        args: [],
        http: 'GET',
        route: `${S}/voucher-groups/currency-list`,
        url: '/hotspot/voucher-groups/currency-list',
    },
    {
        method: 'getVoucherGroupSummary',
        args: ['g1'],
        http: 'GET',
        route: `${S}/vouchers/statistics/summary/voucher-groups/{groupId}`,
        url: '/hotspot/vouchers/statistics/summary/voucher-groups/g1',
    },
    {
        method: 'listUnusedVoucherCodes',
        args: ['g1'],
        http: 'GET',
        route: `${S}/voucher-groups/{groupId}/print-unused`,
        url: '/hotspot/voucher-groups/g1/print-unused',
    },
    {
        method: 'getPortalCandidates',
        args: [{ allPortal: true }],
        http: 'POST',
        route: `${S}/portal/candidates`,
        url: '/hotspot/portal/candidates',
        data: { allPortal: true },
    },
    {
        method: 'getVoucherHistoryStatistics',
        args: [range],
        http: 'GET',
        route: `${S}/vouchers/statistics/history`,
        url: '/hotspot/vouchers/statistics/history',
        params: rangeParams,
    },
    {
        method: 'getVoucherHistoryStatistics',
        args: [range, 'g1'],
        http: 'GET',
        route: `${S}/vouchers/statistics/history/voucher-groups/{groupId}`,
        url: '/hotspot/vouchers/statistics/history/voucher-groups/g1',
        params: groupRangeParams,
    },
    {
        method: 'getVoucherDurationDistribution',
        args: [range],
        http: 'GET',
        route: `${S}/vouchers/statistics/history/distribution/duration`,
        url: '/hotspot/vouchers/statistics/history/distribution/duration',
        params: rangeParams,
    },
    {
        method: 'getVoucherDurationDistribution',
        args: [range, 'g1'],
        http: 'GET',
        route: `${S}/vouchers/statistics/history/distribution/duration/voucher-groups/{groupId}`,
        url: '/hotspot/vouchers/statistics/history/distribution/duration/voucher-groups/g1',
        params: groupRangeParams,
    },
    {
        method: 'getVoucherPriceDistribution',
        args: [range],
        http: 'GET',
        route: `${S}/vouchers/statistics/history/distribution/unit-price`,
        url: '/hotspot/vouchers/statistics/history/distribution/unit-price',
        params: rangeParams,
    },
    {
        method: 'getVoucherPriceDistribution',
        args: [range, 'g1'],
        http: 'GET',
        route: `${S}/vouchers/statistics/history/distribution/unit-price/voucher-groups/{groupId}`,
        url: '/hotspot/vouchers/statistics/history/distribution/unit-price/voucher-groups/g1',
        params: groupRangeParams,
    },
    { method: 'deleteVoucher', args: ['v1'], http: 'DELETE', route: `${S}/vouchers/{id}`, url: '/hotspot/vouchers/v1' },
    {
        method: 'deleteVouchers',
        args: ['g1', ['v1', 'v2']],
        http: 'POST',
        route: `${S}/vouchers/batch/delete`,
        url: '/hotspot/vouchers/batch/delete',
        data: { type: 1, ids: ['v1', 'v2'], groupId: 'g1' },
    },
    {
        method: 'deleteVoucherGroups',
        args: [['g1']],
        http: 'POST',
        route: `${S}/voucher-groups/batch/delete`,
        url: '/hotspot/voucher-groups/batch/delete',
        data: { type: 1, groupIds: ['g1'] },
    },
    {
        method: 'clearExpiredVouchers',
        args: ['g1'],
        http: 'DELETE',
        route: `${S}/voucher-groups/{groupId}/clear-invalid`,
        url: '/hotspot/voucher-groups/g1/clear-invalid',
    },
    {
        method: 'clearExpiredVouchersInGroups',
        args: [['g1', 'g2']],
        http: 'POST',
        route: `${S}/voucher-groups/batch/clear-invalid`,
        url: '/hotspot/voucher-groups/batch/clear-invalid',
        data: { type: 1, groupIds: ['g1', 'g2'] },
    },
    {
        method: 'setVoucherGroupPattern',
        args: ['g1', { patternType: 2 }],
        http: 'PATCH',
        route: `${S}/voucher-groups/{groupId}/pattern`,
        url: '/hotspot/voucher-groups/g1/pattern',
        data: { patternType: 2 },
    },
    { method: 'setVoucherCurrency', args: ['BRL'], http: 'PATCH', route: `${S}/setting`, url: '/hotspot/setting', data: { currency: 'BRL' } },
    { method: 'listAuthSurveys', args: [], http: 'GET', route: `${S}/surveys`, url: '/hotspot/surveys', params: { page: 1, pageSize: 1000 } },
    { method: 'getAuthSurvey', args: ['s1'], http: 'GET', route: `${S}/surveys/{surveyId}`, url: '/hotspot/surveys/s1' },
    { method: 'createAuthSurvey', args: [survey], http: 'POST', route: `${S}/surveys`, url: '/hotspot/surveys', data: survey },
    { method: 'updateAuthSurvey', args: ['s1', survey], http: 'PATCH', route: `${S}/surveys/{surveyId}`, url: '/hotspot/surveys/s1', data: survey },
    { method: 'deleteAuthSurvey', args: ['s1'], http: 'DELETE', route: `${S}/surveys/{surveyId}`, url: '/hotspot/surveys/s1' },
    {
        method: 'listSurveyResults',
        args: ['s1', 1, 10],
        http: 'GET',
        route: `${S}/surveys/{surveyId}/auth-results`,
        url: '/hotspot/surveys/s1/auth-results',
        params: { page: 1, pageSize: 10 },
    },
    {
        method: 'getSurveyResult',
        args: ['r1'],
        http: 'GET',
        route: `${S}/surveys/auth-results/{surveyResultId}`,
        url: '/hotspot/surveys/auth-results/r1',
    },
    {
        method: 'deleteSurveyResults',
        args: ['s1', ['r1']],
        http: 'POST',
        route: `${S}/surveys/{surveyId}/auth-results`,
        url: '/hotspot/surveys/s1/auth-results',
        data: { type: 'include', ids: ['r1'] },
    },
    { method: 'deleteAuthedRecord', args: ['a1'], http: 'DELETE', route: `${S}/authed-records/{id}`, url: '/hotspot/authed-records/a1' },
    {
        method: 'deleteExpiredAuthedRecords',
        args: [{ start: 1, end: 2 }],
        http: 'POST',
        route: `${S}/authed-records/delete`,
        url: '/hotspot/authed-records/delete',
        data: { start: 1, end: 2 },
    },
    {
        method: 'extendAuthedRecord',
        args: ['a1', 60000],
        http: 'POST',
        route: `${S}/authed-records/{id}/period`,
        url: '/hotspot/authed-records/a1/period',
        data: { period: 60000 },
    },
    { method: 'getHotspotLocalUser', args: ['u1'], http: 'GET', route: `${S}/localusers/{id}`, url: '/hotspot/localusers/u1' },
    {
        method: 'deleteHotspotLocalUsers',
        args: [['u1']],
        http: 'POST',
        route: `${S}/localusers/batch/delete`,
        url: '/hotspot/localusers/batch/delete',
        data: { type: 1, ids: ['u1'] },
    },
    {
        method: 'clearLocalUserDynamicMac',
        args: ['u1'],
        http: 'POST',
        route: `${S}/localusers/{id}/clear-dynamic-mac`,
        url: '/hotspot/localusers/u1/clear-dynamic-mac',
    },
    { method: 'getHotspotOperator', args: ['o1'], http: 'GET', route: `${S}/operators/{id}`, url: '/hotspot/operators/o1' },
];

describe('omadaClient/hotspotAdmin', () => {
    const request = { request: vi.fn(), ensureSuccess: vi.fn((value: { result?: unknown }) => value.result) };
    const site = { resolveSiteId: vi.fn(async (id?: string) => id ?? 'site-1') };
    const buildPath = vi.fn((path: string) => `/openapi/v1/cid${path}`);
    let operations: Ops;

    beforeEach(() => {
        vi.clearAllMocks();
        request.request.mockResolvedValue({ errorCode: 0, result: { ok: true } });
        operations = new HotspotAdminOperations(request as never, site as never, buildPath);
    });

    it.each(cases)('$method sends $http to $route', async ({ method, args, http, route, url, data, params }) => {
        expect(spec.paths[`/openapi/v1/{omadacId}${route}`]?.[http.toLowerCase()]).toBeTruthy();
        const fn = operations[method] as (...input: unknown[]) => Promise<unknown>;
        const fixed = [...args, ...Array(Math.max(0, fn.length - args.length - 2)).fill(undefined)];
        await expect(fn.call(operations, ...fixed, 'site-9', { 'X-Request-ID': 'r1' })).resolves.toEqual({ ok: true });
        expect(request.request).toHaveBeenCalledWith(
            {
                url: `/openapi/v1/cid/sites/site-9${url}`,
                method: http,
                ...(data === undefined ? {} : { data }),
                ...(params === undefined ? {} : { params }),
            },
            true,
            { 'X-Request-ID': 'r1' }
        );
    });

    it('reads the hotspot rate limit profiles from their own route', async () => {
        expect(spec.paths['/openapi/v1/{omadacId}/hotspot/sites/{siteId}/setting/profiles/rateLimits']?.get).toBeTruthy();
        await operations.listHotspotRateLimitProfiles();
        expect(request.request).toHaveBeenCalledWith(
            { url: '/openapi/v1/cid/hotspot/sites/site-1/setting/profiles/rateLimits', method: 'GET' },
            true,
            undefined
        );
    });

    it('omits unset voucher filters and rejects invalid input before sending', async () => {
        await operations.getVoucherGroupDetail('g1', { page: 1, pageSize: 5 });
        expect(request.request).toHaveBeenLastCalledWith(
            { url: '/openapi/v1/cid/sites/site-1/hotspot/voucher-groups/g1', method: 'GET', params: { page: 1, pageSize: 5 } },
            true,
            undefined
        );
        request.request.mockClear();
        await expect(operations.deleteVouchers('g1', [])).rejects.toThrow('At least one ID is required.');
        await expect(operations.getVoucherHistoryStatistics({ start: 5, end: 1 })).rejects.toThrow('start must be before end.');
        await expect(operations.setVoucherCurrency('brl')).rejects.toThrow();
        await expect(operations.extendAuthedRecord('a1', 10)).rejects.toThrow();
        await expect(operations.getVoucher(' ')).rejects.toThrow('An identifier is required.');
        expect(request.request).not.toHaveBeenCalled();
    });

    it('accepts survey custom timeouts up to 1,000,000', () => {
        expect(
            authSurveyPayloadSchema.parse({ ...survey, authTimeout: { authTimeout: 0, customTimeout: 1_000_000, customTimeoutUnit: 1 } })
        ).toBeTruthy();
        expect(() => authSurveyPayloadSchema.parse({ ...survey, authTimeout: { authTimeout: 0, customTimeout: 0 } })).toThrow();
    });
});
