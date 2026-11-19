import type { AxiosRequestConfig } from 'axios';
import { z } from 'zod';

import type { CustomHeaders, OmadaApiResponse } from '../types/index.js';
import type { RequestHandler } from './request.js';
import * as schemas from './requestSchemas.js';
import type { SiteOperations } from './site.js';

type In<S extends z.ZodTypeAny> = z.input<S>;

const idSchema = z.string().trim().min(1, 'An identifier is required.');
const idListSchema = z.array(idSchema).min(1, 'At least one ID is required.').max(1000);

/** Voucher statistics ranges are epoch seconds. */
export const secondsRangeSchema = z
    .object({ start: z.number().int().nonnegative(), end: z.number().int().nonnegative() })
    .strict()
    .refine((range) => range.start < range.end, 'start must be before end.');

/** Survey (form authentication) with the 1-1,000,000 custom timeout the controller accepts; the spec text is unit dependent. */
export const authSurveyPayloadSchema = schemas.createFormAuthOpenApiVO06Schema.extend({
    authTimeout: schemas.authTimeOpenApiVO06Schema.extend({
        customTimeout: z.number().int().min(1).max(1_000_000).optional().describe('1-1,000,000 minutes, 1-10,000 hours or 1-1,000 days.'),
    }),
});

export interface VoucherGroupQuery {
    page: number;
    pageSize: number;
    status?: number;
    searchKey?: string;
}

/**
 * Hotspot vouchers, authentication surveys, authorized-client records, local users and operators beyond the
 * basic CRUD in SiteConfigOperations. Batch routes are only called with explicit ID lists, never "select all".
 *
 * Every route is verified against docs/openapi (see tests/omadaClient/hotspotAdmin.test.ts).
 */
export class HotspotAdminOperations {
    constructor(
        private readonly request: RequestHandler,
        private readonly site: SiteOperations,
        private readonly buildPath: (path: string) => string
    ) {}

    private async call(config: AxiosRequestConfig, customHeaders?: CustomHeaders): Promise<unknown> {
        return this.request.ensureSuccess(await this.request.request<OmadaApiResponse<unknown>>(config, true, customHeaders));
    }

    private async site64(siteId?: string): Promise<string> {
        return encodeURIComponent(await this.site.resolveSiteId(siteId));
    }

    // ---- Voucher reads ----
    public async getVoucherGroupDetail(groupId: string, query: VoucherGroupQuery, siteId?: string, h?: CustomHeaders): Promise<unknown> {
        const resolvedSiteId = await this.site64(siteId);
        const params = {
            page: query.page,
            pageSize: query.pageSize,
            ...(query.status === undefined ? {} : { 'filters.status': query.status }),
            ...(query.searchKey ? { searchKey: query.searchKey } : {}),
        };
        return await this.call({ url: this.buildPath(`/sites/${resolvedSiteId}/hotspot/voucher-groups/${seg(groupId)}`), method: 'GET', params }, h);
    }
    public async getVoucher(voucherId: string, siteId?: string, h?: CustomHeaders): Promise<unknown> {
        const resolvedSiteId = await this.site64(siteId);
        return await this.call({ url: this.buildPath(`/sites/${resolvedSiteId}/hotspot/vouchers/${seg(voucherId)}`), method: 'GET' }, h);
    }
    public async listVoucherGroupOptions(page: number, pageSize: number, siteId?: string, h?: CustomHeaders): Promise<unknown> {
        const resolvedSiteId = await this.site64(siteId);
        return await this.call(
            { url: this.buildPath(`/sites/${resolvedSiteId}/hotspot/voucher-group-options`), method: 'GET', params: { page, pageSize } },
            h
        );
    }
    public async getVoucherGroupConfigLimit(siteId?: string, h?: CustomHeaders): Promise<unknown> {
        const resolvedSiteId = await this.site64(siteId);
        return await this.call({ url: this.buildPath(`/sites/${resolvedSiteId}/hotspot/voucher-groups/config-limit`), method: 'GET' }, h);
    }
    public async listVoucherCurrencies(siteId?: string, h?: CustomHeaders): Promise<unknown> {
        const resolvedSiteId = await this.site64(siteId);
        return await this.call({ url: this.buildPath(`/sites/${resolvedSiteId}/hotspot/voucher-groups/currency-list`), method: 'GET' }, h);
    }
    public async getVoucherGroupSummary(groupId: string, siteId?: string, h?: CustomHeaders): Promise<unknown> {
        const resolvedSiteId = await this.site64(siteId);
        const url = this.buildPath(`/sites/${resolvedSiteId}/hotspot/vouchers/statistics/summary/voucher-groups/${seg(groupId)}`);
        return await this.call({ url, method: 'GET' }, h);
    }
    public async listUnusedVoucherCodes(groupId: string, siteId?: string, h?: CustomHeaders): Promise<unknown> {
        const resolvedSiteId = await this.site64(siteId);
        return await this.call(
            { url: this.buildPath(`/sites/${resolvedSiteId}/hotspot/voucher-groups/${seg(groupId)}/print-unused`), method: 'GET' },
            h
        );
    }
    public async getPortalCandidates(
        payload: In<typeof schemas.portalCandidatesOpenApiVOSchema>,
        siteId?: string,
        h?: CustomHeaders
    ): Promise<unknown> {
        const resolvedSiteId = await this.site64(siteId);
        const data = schemas.portalCandidatesOpenApiVOSchema.parse(payload);
        return await this.call({ url: this.buildPath(`/sites/${resolvedSiteId}/hotspot/portal/candidates`), method: 'POST', data }, h);
    }

    // ---- Voucher statistics (epoch seconds; optional voucher group) ----
    public async getVoucherHistoryStatistics(
        range: In<typeof secondsRangeSchema>,
        groupId?: string,
        siteId?: string,
        h?: CustomHeaders
    ): Promise<unknown> {
        const resolvedSiteId = await this.site64(siteId);
        const params = rangeParams(range);
        if (groupId !== undefined) {
            const url = this.buildPath(`/sites/${resolvedSiteId}/hotspot/vouchers/statistics/history/voucher-groups/${seg(groupId)}`);
            return await this.call({ url, method: 'GET', params: { page: 1, pageSize: 1000, ...params } }, h);
        }
        return await this.call({ url: this.buildPath(`/sites/${resolvedSiteId}/hotspot/vouchers/statistics/history`), method: 'GET', params }, h);
    }
    public async getVoucherDurationDistribution(
        range: In<typeof secondsRangeSchema>,
        groupId?: string,
        siteId?: string,
        h?: CustomHeaders
    ): Promise<unknown> {
        const resolvedSiteId = await this.site64(siteId);
        const params = rangeParams(range);
        if (groupId !== undefined) {
            const url = this.buildPath(
                `/sites/${resolvedSiteId}/hotspot/vouchers/statistics/history/distribution/duration/voucher-groups/${seg(groupId)}`
            );
            return await this.call({ url, method: 'GET', params: { page: 1, pageSize: 1000, ...params } }, h);
        }
        const url = this.buildPath(`/sites/${resolvedSiteId}/hotspot/vouchers/statistics/history/distribution/duration`);
        return await this.call({ url, method: 'GET', params }, h);
    }
    public async getVoucherPriceDistribution(
        range: In<typeof secondsRangeSchema>,
        groupId?: string,
        siteId?: string,
        h?: CustomHeaders
    ): Promise<unknown> {
        const resolvedSiteId = await this.site64(siteId);
        const params = rangeParams(range);
        if (groupId !== undefined) {
            const url = this.buildPath(
                `/sites/${resolvedSiteId}/hotspot/vouchers/statistics/history/distribution/unit-price/voucher-groups/${seg(groupId)}`
            );
            return await this.call({ url, method: 'GET', params: { page: 1, pageSize: 1000, ...params } }, h);
        }
        const url = this.buildPath(`/sites/${resolvedSiteId}/hotspot/vouchers/statistics/history/distribution/unit-price`);
        return await this.call({ url, method: 'GET', params }, h);
    }

    // ---- Voucher writes ----
    public async deleteVoucher(voucherId: string, siteId?: string, h?: CustomHeaders): Promise<unknown> {
        const resolvedSiteId = await this.site64(siteId);
        return await this.call({ url: this.buildPath(`/sites/${resolvedSiteId}/hotspot/vouchers/${seg(voucherId)}`), method: 'DELETE' }, h);
    }
    public async deleteVouchers(groupId: string, voucherIds: string[], siteId?: string, h?: CustomHeaders): Promise<unknown> {
        const resolvedSiteId = await this.site64(siteId);
        const data = schemas.selectIdsOpenApiVO06Schema.parse({ type: 1, ids: idListSchema.parse(voucherIds), groupId: idSchema.parse(groupId) });
        return await this.call({ url: this.buildPath(`/sites/${resolvedSiteId}/hotspot/vouchers/batch/delete`), method: 'POST', data }, h);
    }
    public async deleteVoucherGroups(groupIds: string[], siteId?: string, h?: CustomHeaders): Promise<unknown> {
        const resolvedSiteId = await this.site64(siteId);
        const data = schemas.selectVoucherGroupOpenApiVO06Schema.parse({ type: 1, groupIds: idListSchema.parse(groupIds) });
        return await this.call({ url: this.buildPath(`/sites/${resolvedSiteId}/hotspot/voucher-groups/batch/delete`), method: 'POST', data }, h);
    }
    public async clearExpiredVouchers(groupId: string, siteId?: string, h?: CustomHeaders): Promise<unknown> {
        const resolvedSiteId = await this.site64(siteId);
        const url = this.buildPath(`/sites/${resolvedSiteId}/hotspot/voucher-groups/${seg(groupId)}/clear-invalid`);
        return await this.call({ url, method: 'DELETE' }, h);
    }
    public async clearExpiredVouchersInGroups(groupIds: string[], siteId?: string, h?: CustomHeaders): Promise<unknown> {
        const resolvedSiteId = await this.site64(siteId);
        const data = schemas.selectVoucherGroupOpenApiVO06Schema.parse({ type: 1, groupIds: idListSchema.parse(groupIds) });
        return await this.call(
            { url: this.buildPath(`/sites/${resolvedSiteId}/hotspot/voucher-groups/batch/clear-invalid`), method: 'POST', data },
            h
        );
    }
    public async setVoucherGroupPattern(
        groupId: string,
        payload: In<typeof schemas.editVoucherGroupPatternOpenApiVO06Schema>,
        siteId?: string,
        h?: CustomHeaders
    ): Promise<unknown> {
        const resolvedSiteId = await this.site64(siteId);
        const data = schemas.editVoucherGroupPatternOpenApiVO06Schema.parse(payload);
        return await this.call(
            { url: this.buildPath(`/sites/${resolvedSiteId}/hotspot/voucher-groups/${seg(groupId)}/pattern`), method: 'PATCH', data },
            h
        );
    }
    public async setVoucherCurrency(currency: string, siteId?: string, h?: CustomHeaders): Promise<unknown> {
        const resolvedSiteId = await this.site64(siteId);
        const data = schemas.hotspotSiteSettingOpenApiVO06Schema.parse({
            currency: z
                .string()
                .regex(/^[A-Z]{3}$/)
                .parse(currency),
        });
        return await this.call({ url: this.buildPath(`/sites/${resolvedSiteId}/hotspot/setting`), method: 'PATCH', data }, h);
    }

    // ---- Authentication surveys ----
    public async listAuthSurveys(siteId?: string, h?: CustomHeaders): Promise<unknown> {
        const resolvedSiteId = await this.site64(siteId);
        return await this.call(
            { url: this.buildPath(`/sites/${resolvedSiteId}/hotspot/surveys`), method: 'GET', params: { page: 1, pageSize: 1000 } },
            h
        );
    }
    public async getAuthSurvey(surveyId: string, siteId?: string, h?: CustomHeaders): Promise<unknown> {
        const resolvedSiteId = await this.site64(siteId);
        return await this.call({ url: this.buildPath(`/sites/${resolvedSiteId}/hotspot/surveys/${seg(surveyId)}`), method: 'GET' }, h);
    }
    public async createAuthSurvey(payload: In<typeof authSurveyPayloadSchema>, siteId?: string, h?: CustomHeaders): Promise<unknown> {
        const resolvedSiteId = await this.site64(siteId);
        return await this.call(
            { url: this.buildPath(`/sites/${resolvedSiteId}/hotspot/surveys`), method: 'POST', data: authSurveyPayloadSchema.parse(payload) },
            h
        );
    }
    public async updateAuthSurvey(
        surveyId: string,
        payload: In<typeof authSurveyPayloadSchema>,
        siteId?: string,
        h?: CustomHeaders
    ): Promise<unknown> {
        const resolvedSiteId = await this.site64(siteId);
        const data = authSurveyPayloadSchema.parse(payload);
        return await this.call({ url: this.buildPath(`/sites/${resolvedSiteId}/hotspot/surveys/${seg(surveyId)}`), method: 'PATCH', data }, h);
    }
    public async deleteAuthSurvey(surveyId: string, siteId?: string, h?: CustomHeaders): Promise<unknown> {
        const resolvedSiteId = await this.site64(siteId);
        return await this.call({ url: this.buildPath(`/sites/${resolvedSiteId}/hotspot/surveys/${seg(surveyId)}`), method: 'DELETE' }, h);
    }
    public async listSurveyResults(surveyId: string, page: number, pageSize: number, siteId?: string, h?: CustomHeaders): Promise<unknown> {
        const resolvedSiteId = await this.site64(siteId);
        const url = this.buildPath(`/sites/${resolvedSiteId}/hotspot/surveys/${seg(surveyId)}/auth-results`);
        return await this.call({ url, method: 'GET', params: { page, pageSize } }, h);
    }
    public async getSurveyResult(resultId: string, siteId?: string, h?: CustomHeaders): Promise<unknown> {
        const resolvedSiteId = await this.site64(siteId);
        return await this.call({ url: this.buildPath(`/sites/${resolvedSiteId}/hotspot/surveys/auth-results/${seg(resultId)}`), method: 'GET' }, h);
    }
    public async deleteSurveyResults(surveyId: string, resultIds: string[], siteId?: string, h?: CustomHeaders): Promise<unknown> {
        const resolvedSiteId = await this.site64(siteId);
        const data = schemas.formAuthResultSelector06Schema.parse({ type: 'include', ids: idListSchema.parse(resultIds) });
        const url = this.buildPath(`/sites/${resolvedSiteId}/hotspot/surveys/${seg(surveyId)}/auth-results`);
        return await this.call({ url, method: 'POST', data }, h);
    }

    // ---- Authorized client records ----
    public async deleteAuthedRecord(recordId: string, siteId?: string, h?: CustomHeaders): Promise<unknown> {
        const resolvedSiteId = await this.site64(siteId);
        return await this.call({ url: this.buildPath(`/sites/${resolvedSiteId}/hotspot/authed-records/${seg(recordId)}`), method: 'DELETE' }, h);
    }
    public async deleteExpiredAuthedRecords(
        payload: In<typeof schemas.deleteFilterInfo06Schema>,
        siteId?: string,
        h?: CustomHeaders
    ): Promise<unknown> {
        const resolvedSiteId = await this.site64(siteId);
        const data = schemas.deleteFilterInfo06Schema.parse(payload);
        return await this.call({ url: this.buildPath(`/sites/${resolvedSiteId}/hotspot/authed-records/delete`), method: 'POST', data }, h);
    }
    public async extendAuthedRecord(recordId: string, periodMs: number, siteId?: string, h?: CustomHeaders): Promise<unknown> {
        const resolvedSiteId = await this.site64(siteId);
        const data = schemas.extendOpenApiVO06Schema.parse({ period: periodMs });
        return await this.call(
            { url: this.buildPath(`/sites/${resolvedSiteId}/hotspot/authed-records/${seg(recordId)}/period`), method: 'POST', data },
            h
        );
    }

    // ---- Local users and operators ----
    public async getHotspotLocalUser(userId: string, siteId?: string, h?: CustomHeaders): Promise<unknown> {
        const resolvedSiteId = await this.site64(siteId);
        return await this.call({ url: this.buildPath(`/sites/${resolvedSiteId}/hotspot/localusers/${seg(userId)}`), method: 'GET' }, h);
    }
    public async deleteHotspotLocalUsers(userIds: string[], siteId?: string, h?: CustomHeaders): Promise<unknown> {
        const resolvedSiteId = await this.site64(siteId);
        const data = schemas.selectLocalUsersOpenApiVO06Schema.parse({ type: 1, ids: idListSchema.parse(userIds) });
        return await this.call({ url: this.buildPath(`/sites/${resolvedSiteId}/hotspot/localusers/batch/delete`), method: 'POST', data }, h);
    }
    public async clearLocalUserDynamicMac(userId: string, siteId?: string, h?: CustomHeaders): Promise<unknown> {
        const resolvedSiteId = await this.site64(siteId);
        const url = this.buildPath(`/sites/${resolvedSiteId}/hotspot/localusers/${seg(userId)}/clear-dynamic-mac`);
        return await this.call({ url, method: 'POST' }, h);
    }
    public async getHotspotOperator(operatorId: string, siteId?: string, h?: CustomHeaders): Promise<unknown> {
        const resolvedSiteId = await this.site64(siteId);
        return await this.call({ url: this.buildPath(`/sites/${resolvedSiteId}/hotspot/operators/${seg(operatorId)}`), method: 'GET' }, h);
    }
    public async listHotspotRateLimitProfiles(siteId?: string, h?: CustomHeaders): Promise<unknown> {
        const resolvedSiteId = await this.site64(siteId);
        return await this.call({ url: this.buildPath(`/hotspot/sites/${resolvedSiteId}/setting/profiles/rateLimits`), method: 'GET' }, h);
    }
}

function rangeParams(range: In<typeof secondsRangeSchema>): Record<string, number> {
    const { start, end } = secondsRangeSchema.parse(range);
    return { 'filters.timeStart': start, 'filters.timeEnd': end };
}

function seg(value: string): string {
    return encodeURIComponent(idSchema.parse(value));
}
