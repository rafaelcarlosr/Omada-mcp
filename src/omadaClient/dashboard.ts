import type { AxiosRequestConfig } from 'axios';
import { z } from 'zod';

import type { CustomHeaders, OmadaApiResponse } from '../types/index.js';
import type { RequestHandler } from './request.js';
import * as schemas from './requestSchemas.js';
import type { SiteOperations } from './site.js';

type In<S extends z.ZodTypeAny> = z.input<S>;

const idSchema = z.string().trim().min(1, 'An identifier is required.');
const macPathSchema = z.string().regex(/^[0-9a-f]{2}([:-][0-9a-f]{2}){5}$/i, 'A valid MAC address is required.');

/** Site dashboard ranges are epoch seconds (milliseconds are rejected with -1001). */
export const secondsRangeSchema = z
    .object({ start: z.number().int().nonnegative(), end: z.number().int().nonnegative() })
    .strict()
    .refine((range) => range.start < range.end, 'start must be before end.');

/**
 * Site dashboard reads not covered by MonitorOperations (application and client traffic, client distributions,
 * association statistics, top APs, overview card) and the dashboard tab layout.
 *
 * Every route is verified against docs/openapi (see tests/omadaClient/dashboard.test.ts).
 */
export class DashboardOperations {
    constructor(
        private readonly request: RequestHandler,
        private readonly site: SiteOperations,
        private readonly buildPath: (path: string, version?: string) => string
    ) {}

    private async call(config: AxiosRequestConfig, customHeaders?: CustomHeaders): Promise<unknown> {
        return this.request.ensureSuccess(await this.request.request<OmadaApiResponse<unknown>>(config, true, customHeaders));
    }

    private async siteSegment(siteId?: string): Promise<string> {
        return encodeURIComponent(await this.site.resolveSiteId(siteId));
    }

    public async getTopAps(range: In<typeof secondsRangeSchema>, siteId?: string, h?: CustomHeaders): Promise<unknown> {
        const resolvedSiteId = await this.siteSegment(siteId);
        return await this.call(
            { url: this.buildPath(`/sites/${resolvedSiteId}/dashboard/top-aps`), method: 'GET', params: secondsRangeSchema.parse(range) },
            h
        );
    }
    public async getMostActiveApps(range: In<typeof secondsRangeSchema>, siteId?: string, h?: CustomHeaders): Promise<unknown> {
        const resolvedSiteId = await this.siteSegment(siteId);
        return await this.call(
            {
                url: this.buildPath(`/sites/${resolvedSiteId}/dashboard/mostActiveAppTraffic`),
                method: 'GET',
                params: secondsRangeSchema.parse(range),
            },
            h
        );
    }
    public async getAllNetworkActivity(range: In<typeof secondsRangeSchema>, siteId?: string, h?: CustomHeaders): Promise<unknown> {
        const resolvedSiteId = await this.siteSegment(siteId);
        return await this.call(
            { url: this.buildPath(`/sites/${resolvedSiteId}/dashboard/allNetworkActivity`), method: 'GET', params: secondsRangeSchema.parse(range) },
            h
        );
    }
    public async getClientAssociationActivities(range: In<typeof secondsRangeSchema>, siteId?: string, h?: CustomHeaders): Promise<unknown> {
        const resolvedSiteId = await this.siteSegment(siteId);
        return await this.call(
            {
                url: this.buildPath(`/sites/${resolvedSiteId}/dashboard/client-association-activities`),
                method: 'GET',
                params: secondsRangeSchema.parse(range),
            },
            h
        );
    }
    public async getClientAssociationTimeDistribution(range: In<typeof secondsRangeSchema>, siteId?: string, h?: CustomHeaders): Promise<unknown> {
        const resolvedSiteId = await this.siteSegment(siteId);
        return await this.call(
            {
                url: this.buildPath(`/sites/${resolvedSiteId}/dashboard/client-association-time-distribution`),
                method: 'GET',
                params: secondsRangeSchema.parse(range),
            },
            h
        );
    }
    public async getClientAppTraffic(clientMac: string, range: In<typeof secondsRangeSchema>, siteId?: string, h?: CustomHeaders): Promise<unknown> {
        const resolvedSiteId = await this.siteSegment(siteId);
        return await this.call(
            {
                url: this.buildPath(`/sites/${resolvedSiteId}/dashboard/specificClientInfo/${mac(clientMac)}`),
                method: 'GET',
                params: secondsRangeSchema.parse(range),
            },
            h
        );
    }
    public async getAppClientTraffic(
        applicationId: string,
        range: In<typeof secondsRangeSchema>,
        siteId?: string,
        h?: CustomHeaders
    ): Promise<unknown> {
        const resolvedSiteId = await this.siteSegment(siteId);
        return await this.call(
            {
                url: this.buildPath(`/sites/${resolvedSiteId}/dashboard/specificAppInfo/${seg(applicationId)}`),
                method: 'GET',
                params: secondsRangeSchema.parse(range),
            },
            h
        );
    }
    public async getCategoryClientTraffic(
        familyId: string,
        range: In<typeof secondsRangeSchema>,
        siteId?: string,
        h?: CustomHeaders
    ): Promise<unknown> {
        const resolvedSiteId = await this.siteSegment(siteId);
        return await this.call(
            {
                url: this.buildPath(`/sites/${resolvedSiteId}/dashboard/categoryUserInfo/${seg(familyId)}`),
                method: 'GET',
                params: secondsRangeSchema.parse(range),
            },
            h
        );
    }
    public async getCategoryAppTraffic(familyId: string, range: In<typeof secondsRangeSchema>, siteId?: string, h?: CustomHeaders): Promise<unknown> {
        const resolvedSiteId = await this.siteSegment(siteId);
        return await this.call(
            {
                url: this.buildPath(`/sites/${resolvedSiteId}/dashboard/categoryAppInfo/${seg(familyId)}`),
                method: 'GET',
                params: secondsRangeSchema.parse(range),
            },
            h
        );
    }
    public async listClientTraffic(
        range: In<typeof secondsRangeSchema>,
        page: number,
        pageSize: number,
        siteId?: string,
        h?: CustomHeaders
    ): Promise<unknown> {
        const resolvedSiteId = await this.siteSegment(siteId);
        return await this.call(
            {
                url: this.buildPath(`/sites/${resolvedSiteId}/dashboard/clientTraffic`),
                method: 'GET',
                params: { ...secondsRangeSchema.parse(range), page, pageSize },
            },
            h
        );
    }
    public async listAppCategories(
        range: In<typeof secondsRangeSchema>,
        page: number,
        pageSize: number,
        siteId?: string,
        h?: CustomHeaders
    ): Promise<unknown> {
        const resolvedSiteId = await this.siteSegment(siteId);
        return await this.call(
            {
                url: this.buildPath(`/sites/${resolvedSiteId}/dashboard/categoryInfo`),
                method: 'GET',
                params: { ...secondsRangeSchema.parse(range), page, pageSize },
            },
            h
        );
    }
    public async listBlockedApps(
        range: In<typeof secondsRangeSchema>,
        page: number,
        pageSize: number,
        siteId?: string,
        h?: CustomHeaders
    ): Promise<unknown> {
        const resolvedSiteId = await this.siteSegment(siteId);
        return await this.call(
            {
                url: this.buildPath(`/sites/${resolvedSiteId}/dashboard/blockApp`),
                method: 'GET',
                params: { ...secondsRangeSchema.parse(range), page, pageSize },
            },
            h
        );
    }
    public async listAllowedApps(
        range: In<typeof secondsRangeSchema>,
        page: number,
        pageSize: number,
        siteId?: string,
        h?: CustomHeaders
    ): Promise<unknown> {
        const resolvedSiteId = await this.siteSegment(siteId);
        return await this.call(
            {
                url: this.buildPath(`/sites/${resolvedSiteId}/dashboard/allowApp`),
                method: 'GET',
                params: { ...secondsRangeSchema.parse(range), page, pageSize },
            },
            h
        );
    }
    public async getLongestClientUptime(siteId?: string, h?: CustomHeaders): Promise<unknown> {
        const resolvedSiteId = await this.siteSegment(siteId);
        return await this.call({ url: this.buildPath(`/sites/${resolvedSiteId}/dashboard/longest-uptime`), method: 'GET' }, h);
    }
    public async getCurrentClientCount(siteId?: string, h?: CustomHeaders): Promise<unknown> {
        const resolvedSiteId = await this.siteSegment(siteId);
        return await this.call({ url: this.buildPath(`/sites/${resolvedSiteId}/dashboard/current-client-num`), method: 'GET' }, h);
    }
    public async getClientsBubble(siteId?: string, h?: CustomHeaders): Promise<unknown> {
        const resolvedSiteId = await this.siteSegment(siteId);
        return await this.call({ url: this.buildPath(`/sites/${resolvedSiteId}/dashboard/clients-bubble`), method: 'GET' }, h);
    }
    public async getClientSsidDistribution(siteId?: string, h?: CustomHeaders): Promise<unknown> {
        const resolvedSiteId = await this.siteSegment(siteId);
        return await this.call({ url: this.buildPath(`/sites/${resolvedSiteId}/dashboard/client-ssid-distribution`), method: 'GET' }, h);
    }
    public async getClientSignalDistribution(siteId?: string, h?: CustomHeaders): Promise<unknown> {
        const resolvedSiteId = await this.siteSegment(siteId);
        return await this.call({ url: this.buildPath(`/sites/${resolvedSiteId}/dashboard/client-signal-distribution`), method: 'GET' }, h);
    }
    public async getClientRssiDistribution(siteId?: string, h?: CustomHeaders): Promise<unknown> {
        const resolvedSiteId = await this.siteSegment(siteId);
        return await this.call({ url: this.buildPath(`/sites/${resolvedSiteId}/dashboard/client-rssi-distribution`), method: 'GET' }, h);
    }
    public async getClientFrequencyDistribution(siteId?: string, h?: CustomHeaders): Promise<unknown> {
        const resolvedSiteId = await this.siteSegment(siteId);
        return await this.call({ url: this.buildPath(`/sites/${resolvedSiteId}/dashboard/client-freq-distribution`), method: 'GET' }, h);
    }
    public async getApDensity(siteId?: string, h?: CustomHeaders): Promise<unknown> {
        const resolvedSiteId = await this.siteSegment(siteId);
        return await this.call({ url: this.buildPath(`/sites/${resolvedSiteId}/dashboard/ap-density`), method: 'GET' }, h);
    }
    public async getGatewayIspLoad(siteId?: string, h?: CustomHeaders): Promise<unknown> {
        const resolvedSiteId = await this.siteSegment(siteId);
        return await this.call({ url: this.buildPath(`/sites/${resolvedSiteId}/dashboard/gateway/isp/load`), method: 'GET' }, h);
    }
    public async getNetworkOverviewCard(siteId?: string, h?: CustomHeaders): Promise<unknown> {
        const resolvedSiteId = await this.siteSegment(siteId);
        return await this.call({ url: this.buildPath(`/sites/${resolvedSiteId}/dashboard/card/overview`), method: 'GET' }, h);
    }
    public async listDashboardTabs(siteId?: string, h?: CustomHeaders): Promise<unknown> {
        const resolvedSiteId = await this.siteSegment(siteId);
        return await this.call({ url: this.buildPath(`/sites/${resolvedSiteId}/dashboard/tabs`), method: 'GET' }, h);
    }
    public async listDashboardTabsWithoutOverall(siteId?: string, h?: CustomHeaders): Promise<unknown> {
        const resolvedSiteId = await this.siteSegment(siteId);
        return await this.call({ url: this.buildPath(`/sites/${resolvedSiteId}/dashboard/without-overall-tabs`), method: 'GET' }, h);
    }
    public async listMostActiveEapsByTraffic(
        deviceNum: number,
        range: In<typeof secondsRangeSchema>,
        siteId?: string,
        h?: CustomHeaders
    ): Promise<unknown> {
        const resolvedSiteId = await this.siteSegment(siteId);
        const params = { deviceNum: z.number().int().min(1).max(100).parse(deviceNum), ...secondsRangeSchema.parse(range) };
        return await this.call({ url: this.buildPath(`/sites/${resolvedSiteId}/dashboard/most-active-eaps`, 'v2'), method: 'GET', params }, h);
    }
    public async searchClientTraffic(
        payload: In<typeof schemas.clientTrafficOpenApiQueryDataVOSchema>,
        siteId?: string,
        h?: CustomHeaders
    ): Promise<unknown> {
        const resolvedSiteId = await this.siteSegment(siteId);
        const data = schemas.clientTrafficOpenApiQueryDataVOSchema.parse(payload);
        return await this.call({ url: this.buildPath(`/sites/${resolvedSiteId}/dashboard/clientTraffic`), method: 'POST', data }, h);
    }

    // ---- Dashboard tabs ----
    public async createDashboardTab(name: string, siteId?: string, h?: CustomHeaders): Promise<unknown> {
        const resolvedSiteId = await this.siteSegment(siteId);
        const data = schemas.createTabOpenApiVOSchema.parse({ name });
        return await this.call({ url: this.buildPath(`/sites/${resolvedSiteId}/dashboard/tabs`), method: 'POST', data }, h);
    }
    public async updateDashboardTab(
        tabId: string,
        payload: In<typeof schemas.updateTabOpenApiVOSchema>,
        siteId?: string,
        h?: CustomHeaders
    ): Promise<unknown> {
        const resolvedSiteId = await this.siteSegment(siteId);
        const data = schemas.updateTabOpenApiVOSchema.parse(payload);
        return await this.call({ url: this.buildPath(`/sites/${resolvedSiteId}/dashboard/tabs/${seg(tabId)}`), method: 'PATCH', data }, h);
    }
    public async deleteDashboardTab(tabId: string, siteId?: string, h?: CustomHeaders): Promise<unknown> {
        const resolvedSiteId = await this.siteSegment(siteId);
        return await this.call({ url: this.buildPath(`/sites/${resolvedSiteId}/dashboard/tabs/${seg(tabId)}`), method: 'DELETE' }, h);
    }
    /** Replaces the whole tab set: tabs left out are deleted. Callers must send every tab they want to keep. */
    public async setDashboardTabs(payload: In<typeof schemas.batchEditTabsSchema>, siteId?: string, h?: CustomHeaders): Promise<unknown> {
        const resolvedSiteId = await this.siteSegment(siteId);
        const data = schemas.batchEditTabsSchema.parse(payload);
        return await this.call({ url: this.buildPath(`/sites/${resolvedSiteId}/dashboard/multi-tabs/config`), method: 'PATCH', data }, h);
    }
}

function seg(value: string): string {
    return encodeURIComponent(idSchema.parse(value));
}

function mac(value: string): string {
    return encodeURIComponent(macPathSchema.parse(value));
}
