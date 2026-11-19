import type { AxiosRequestConfig } from 'axios';
import { z } from 'zod';

import type { CustomHeaders, OmadaApiResponse } from '../types/index.js';
import type { RequestHandler } from './request.js';
import * as schemas from './requestSchemas.js';
import type { SiteOperations } from './site.js';

type In<S extends z.ZodTypeAny> = z.input<S>;

const idSchema = z.string().trim().min(1, 'An identifier is required.');
const macPathSchema = z.string().regex(/^[0-9a-f]{2}([:-][0-9a-f]{2}){5}$/i, 'A valid MAC address is required.');

/** Incident and health ranges are epoch milliseconds (seconds return empty timelines or -1). */
export const msRangeSchema = z
    .object({ startTime: z.number().int().nonnegative(), endTime: z.number().int().nonnegative() })
    .strict()
    .refine((range) => range.startTime < range.endTime, 'startTime must be before endTime.');

export interface IncidentFilters {
    status?: number;
    category?: string;
    anomalyCode?: string;
}

/** Report tab body for custom tabs: name, enabled state and card groups. */
export const reportTabPayloadSchema = z
    .object({
        name: z.string().trim().min(1).max(64).describe('Tab name.'),
        status: z.number().int().min(0).max(1).default(1).describe('1 enabled, 0 disabled.'),
        cardGroupList: z
            .array(z.object({ cardGroupName: z.string().min(1), cardList: z.array(z.string().min(1)).min(1) }).strict())
            .min(1)
            .describe('Card groups, e.g. [{ cardGroupName: "traffic", cardList: ["internet", "network"] }]; see listReportTabs for names.'),
    })
    .strict();

/**
 * Incident detection (anomalies), Wi-Fi and AP health and network report tabs.
 *
 * Every route is verified against docs/openapi (see tests/omadaClient/monitoring.test.ts).
 */
export class MonitoringOperations {
    constructor(
        private readonly request: RequestHandler,
        private readonly site: SiteOperations,
        private readonly buildPath: (path: string) => string
    ) {}

    private async call(config: AxiosRequestConfig, customHeaders?: CustomHeaders): Promise<unknown> {
        return this.request.ensureSuccess(await this.request.request<OmadaApiResponse<unknown>>(config, true, customHeaders));
    }

    private async siteSegment(siteId?: string): Promise<string> {
        return encodeURIComponent(await this.site.resolveSiteId(siteId));
    }

    // ---- Incidents ----
    public async listAnomalyIncidents(
        range: In<typeof msRangeSchema>,
        page: number,
        pageSize: number,
        filters: IncidentFilters = {},
        siteId?: string,
        h?: CustomHeaders
    ): Promise<unknown> {
        const resolvedSiteId = await this.siteSegment(siteId);
        const { startTime, endTime } = msRangeSchema.parse(range);
        const params = {
            page,
            pageSize,
            'filters.startTime': startTime,
            'filters.endTime': endTime,
            ...(filters.status === undefined ? {} : { 'filters.status': filters.status }),
            ...(filters.category ? { 'filters.category': filters.category } : {}),
            ...(filters.anomalyCode ? { 'filters.anomalyCode': filters.anomalyCode } : {}),
        };
        return await this.call({ url: this.buildPath(`/sites/${resolvedSiteId}/anomaly/incidents`), method: 'GET', params }, h);
    }
    public async getAnomalyIncident(incidentId: string, siteId?: string, h?: CustomHeaders): Promise<unknown> {
        const resolvedSiteId = await this.siteSegment(siteId);
        return await this.call({ url: this.buildPath(`/sites/${resolvedSiteId}/anomaly/incident/${seg(incidentId)}`), method: 'GET' }, h);
    }
    public async getUnresolvedIncidentCount(siteId?: string, h?: CustomHeaders): Promise<unknown> {
        const resolvedSiteId = await this.siteSegment(siteId);
        return await this.call({ url: this.buildPath(`/sites/${resolvedSiteId}/anomaly/unresolved-incidents`), method: 'GET' }, h);
    }
    public async getAnomalyStatistics(range: In<typeof msRangeSchema>, siteId?: string, h?: CustomHeaders): Promise<unknown> {
        const resolvedSiteId = await this.siteSegment(siteId);
        return await this.call(
            { url: this.buildPath(`/sites/${resolvedSiteId}/anomaly/overview/statistics`), method: 'GET', params: filterRange(range) },
            h
        );
    }
    public async getAnomalyIncidentDistribution(range: In<typeof msRangeSchema>, siteId?: string, h?: CustomHeaders): Promise<unknown> {
        const resolvedSiteId = await this.siteSegment(siteId);
        const url = this.buildPath(`/sites/${resolvedSiteId}/anomaly/overview/incident-distribution`);
        return await this.call({ url, method: 'GET', params: filterRange(range) }, h);
    }
    public async getAnomalyCategoryIncidents(
        range: In<typeof msRangeSchema>,
        category: number,
        siteId?: string,
        h?: CustomHeaders
    ): Promise<unknown> {
        const resolvedSiteId = await this.siteSegment(siteId);
        const params = { ...filterRange(range), category: z.number().int().min(11).max(19).parse(category) };
        return await this.call({ url: this.buildPath(`/sites/${resolvedSiteId}/anomaly/category`), method: 'GET', params }, h);
    }
    public async listInfluencingDevices(
        deviceMac: string,
        anomalyCode: string,
        page: number,
        pageSize: number,
        siteId?: string,
        h?: CustomHeaders
    ): Promise<unknown> {
        const resolvedSiteId = await this.siteSegment(siteId);
        const params = { anomalyCode: idSchema.parse(anomalyCode), page, pageSize };
        return await this.call(
            { url: this.buildPath(`/sites/${resolvedSiteId}/anomaly/${mac(deviceMac)}/influencing-devices`), method: 'GET', params },
            h
        );
    }
    public async listInfluencingClients(
        deviceMac: string,
        anomalyCode: string,
        page: number,
        pageSize: number,
        siteId?: string,
        h?: CustomHeaders
    ): Promise<unknown> {
        const resolvedSiteId = await this.siteSegment(siteId);
        const params = { anomalyCode: idSchema.parse(anomalyCode), page, pageSize };
        return await this.call(
            { url: this.buildPath(`/sites/${resolvedSiteId}/anomaly/${mac(deviceMac)}/influencing-clients`), method: 'GET', params },
            h
        );
    }
    public async listDeviceIncidents(
        deviceMac: string,
        range: In<typeof msRangeSchema>,
        page: number,
        pageSize: number,
        siteId?: string,
        h?: CustomHeaders
    ): Promise<unknown> {
        const resolvedSiteId = await this.siteSegment(siteId);
        const params = { page, pageSize, ...filterRange(range) };
        return await this.call({ url: this.buildPath(`/sites/${resolvedSiteId}/incident/${mac(deviceMac)}`), method: 'GET', params }, h);
    }
    public async listStackIncidents(
        stackId: string,
        range: In<typeof msRangeSchema>,
        page: number,
        pageSize: number,
        siteId?: string,
        h?: CustomHeaders
    ): Promise<unknown> {
        const resolvedSiteId = await this.siteSegment(siteId);
        const params = { page, pageSize, ...filterRange(range) };
        return await this.call({ url: this.buildPath(`/sites/${resolvedSiteId}/incident/stack/${seg(stackId)}`), method: 'GET', params }, h);
    }
    public async getIncidentRanking(query: In<typeof schemas.incidentRankingQueryVOSchema>, siteId?: string, h?: CustomHeaders): Promise<unknown> {
        const resolvedSiteId = await this.siteSegment(siteId);
        const data = schemas.incidentRankingQueryVOSchema.parse(query);
        return await this.call({ url: this.buildPath(`/sites/${resolvedSiteId}/anomaly/overview/ranking-cards`), method: 'POST', data }, h);
    }
    public async getIncidentObjectRanking(
        query: In<typeof schemas.incidentRankingQueryVOSchema>,
        siteId?: string,
        h?: CustomHeaders
    ): Promise<unknown> {
        const resolvedSiteId = await this.siteSegment(siteId);
        const data = schemas.incidentRankingQueryVOSchema.parse(query);
        return await this.call({ url: this.buildPath(`/sites/${resolvedSiteId}/anomaly/incidents/ranking-cards`), method: 'POST', data }, h);
    }
    public async setIncidentStatus(incidentIds: string[], targetStatus: number, siteId?: string, h?: CustomHeaders): Promise<unknown> {
        const resolvedSiteId = await this.siteSegment(siteId);
        const data = schemas.anomalyListSettingVOSchema.parse({
            incidents: z.array(idSchema).min(1).max(1000).parse(incidentIds),
            selectAll: false,
            targetStatus: z.number().int().min(0).max(2).parse(targetStatus),
        });
        return await this.call({ url: this.buildPath(`/sites/${resolvedSiteId}/anomaly/incident/status`), method: 'POST', data }, h);
    }
    public async deleteIncidents(incidentIds: string[], siteId?: string, h?: CustomHeaders): Promise<unknown> {
        const resolvedSiteId = await this.siteSegment(siteId);
        const data = schemas.deleteAnomalyListSettingVOSchema.parse({
            incidents: z.array(idSchema).min(1).max(1000).parse(incidentIds),
            selectAll: false,
        });
        return await this.call({ url: this.buildPath(`/sites/${resolvedSiteId}/anomaly/incident`), method: 'DELETE', data }, h);
    }

    // ---- Incident detection settings ----
    public async listAnomalySettings(page: number, pageSize: number, siteId?: string, h?: CustomHeaders): Promise<unknown> {
        const resolvedSiteId = await this.siteSegment(siteId);
        return await this.call({ url: this.buildPath(`/sites/${resolvedSiteId}/anomaly/setting`), method: 'GET', params: { page, pageSize } }, h);
    }
    public async setAnomalyEventSetting(
        payload: In<typeof schemas.anomalyEventSettingEditOpenApiVOSchema>,
        siteId?: string,
        h?: CustomHeaders
    ): Promise<unknown> {
        const resolvedSiteId = await this.siteSegment(siteId);
        const data = schemas.anomalyEventSettingEditOpenApiVOSchema.parse(payload);
        return await this.call({ url: this.buildPath(`/sites/${resolvedSiteId}/anomaly/setting/modify`), method: 'PATCH', data }, h);
    }
    public async getAnomalyNotificationSetting(siteId?: string, h?: CustomHeaders): Promise<unknown> {
        const resolvedSiteId = await this.siteSegment(siteId);
        return await this.call({ url: this.buildPath(`/sites/${resolvedSiteId}/anomaly/notification`), method: 'GET' }, h);
    }
    public async setAnomalyNotification(
        payload: In<typeof schemas.setNotificationOpenApiVOSchema>,
        siteId?: string,
        h?: CustomHeaders
    ): Promise<unknown> {
        const resolvedSiteId = await this.siteSegment(siteId);
        const data = schemas.setNotificationOpenApiVOSchema.parse(payload);
        return await this.call({ url: this.buildPath(`/sites/${resolvedSiteId}/anomaly/notification`), method: 'PATCH', data }, h);
    }

    // ---- Wi-Fi and AP health (epoch milliseconds) ----
    public async getWifiHealthTimeline(range: In<typeof msRangeSchema>, siteId?: string, h?: CustomHeaders): Promise<unknown> {
        const resolvedSiteId = await this.siteSegment(siteId);
        return await this.call({ url: this.buildPath(`/sites/${resolvedSiteId}/wifi/health/timeline`), method: 'GET', params: startEnd(range) }, h);
    }
    public async getWifiSubHealthTimeline(range: In<typeof msRangeSchema>, siteId?: string, h?: CustomHeaders): Promise<unknown> {
        const resolvedSiteId = await this.siteSegment(siteId);
        return await this.call(
            { url: this.buildPath(`/sites/${resolvedSiteId}/wifi/sub/health/timeline`), method: 'GET', params: startEnd(range) },
            h
        );
    }
    public async getApHealthDetail(apMac: string, range: In<typeof msRangeSchema>, siteId?: string, h?: CustomHeaders): Promise<unknown> {
        const resolvedSiteId = await this.siteSegment(siteId);
        return await this.call(
            { url: this.buildPath(`/sites/${resolvedSiteId}/eaps/${mac(apMac)}/health/detail`), method: 'GET', params: startEnd(range) },
            h
        );
    }
    public async getApHealthTimeline(apMac: string, range: In<typeof msRangeSchema>, siteId?: string, h?: CustomHeaders): Promise<unknown> {
        const resolvedSiteId = await this.siteSegment(siteId);
        const url = this.buildPath(`/sites/${resolvedSiteId}/eaps/${mac(apMac)}/health/timeline`);
        return await this.call({ url, method: 'GET', params: startEnd(range) }, h);
    }
    public async listWifiHealthTopClients(time: number, topK: number, searchKey?: string, siteId?: string, h?: CustomHeaders): Promise<unknown> {
        const resolvedSiteId = await this.siteSegment(siteId);
        const data = {
            time: z.number().int().nonnegative().parse(time),
            topK: z.number().int().min(1).max(99).parse(topK),
            ...(searchKey ? { searchKey } : {}),
        };
        return await this.call({ url: this.buildPath(`/sites/${resolvedSiteId}/wifi/health/client/list`), method: 'POST', data }, h);
    }

    // ---- Network report tabs ----
    public async listReportTabs(siteId?: string, h?: CustomHeaders): Promise<unknown> {
        const resolvedSiteId = await this.siteSegment(siteId);
        return await this.call({ url: this.buildPath(`/sites/${resolvedSiteId}/report/allTabs`), method: 'GET' }, h);
    }
    public async getReportTab(tabId: string, siteId?: string, h?: CustomHeaders): Promise<unknown> {
        const resolvedSiteId = await this.siteSegment(siteId);
        return await this.call({ url: this.buildPath(`/sites/${resolvedSiteId}/report/${seg(tabId)}`), method: 'GET' }, h);
    }
    public async createReportTab(payload: In<typeof reportTabPayloadSchema>, siteId?: string, h?: CustomHeaders): Promise<unknown> {
        const resolvedSiteId = await this.siteSegment(siteId);
        const data = schemas.reportTabSchema.parse({ ...reportTabPayloadSchema.parse(payload), type: 1 });
        return await this.call({ url: this.buildPath(`/sites/${resolvedSiteId}/report/tab`), method: 'POST', data }, h);
    }
    public async updateReportTab(tabId: string, payload: In<typeof reportTabPayloadSchema>, siteId?: string, h?: CustomHeaders): Promise<unknown> {
        const resolvedSiteId = await this.siteSegment(siteId);
        const data = schemas.reportTabSchema.parse({ ...reportTabPayloadSchema.parse(payload), tabId: idSchema.parse(tabId), type: 1 });
        return await this.call({ url: this.buildPath(`/sites/${resolvedSiteId}/report/tab`), method: 'PUT', data }, h);
    }
    /** The path segment is a JSON array of tab IDs; a bare ID or comma list returns -1. */
    public async deleteReportTabs(tabIds: string[], siteId?: string, h?: CustomHeaders): Promise<unknown> {
        const resolvedSiteId = await this.siteSegment(siteId);
        const ids = z.array(idSchema).min(1).max(100).parse(tabIds);
        return await this.call(
            { url: this.buildPath(`/sites/${resolvedSiteId}/report/tab/${encodeURIComponent(JSON.stringify(ids))}`), method: 'DELETE' },
            h
        );
    }
}

function filterRange(range: In<typeof msRangeSchema>): Record<string, number> {
    const { startTime, endTime } = msRangeSchema.parse(range);
    return { 'filters.startTime': startTime, 'filters.endTime': endTime };
}

function startEnd(range: In<typeof msRangeSchema>): Record<string, number> {
    const { startTime, endTime } = msRangeSchema.parse(range);
    return { start: startTime, end: endTime };
}

function seg(value: string): string {
    return encodeURIComponent(idSchema.parse(value));
}

function mac(value: string): string {
    return encodeURIComponent(macPathSchema.parse(value));
}
