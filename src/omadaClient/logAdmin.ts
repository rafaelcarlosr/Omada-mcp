import type { AxiosRequestConfig } from 'axios';
import { z } from 'zod';

import type { CustomHeaders, OmadaApiResponse } from '../types/index.js';
import type { RequestHandler } from './request.js';
import * as schemas from './requestSchemas.js';
import type { SiteOperations } from './site.js';

type In<S extends z.ZodTypeAny> = z.input<S>;

const idSchema = z.string().trim().min(1, 'An identifier is required.');
const macPathSchema = z.string().regex(/^[0-9a-f]{2}([:-][0-9a-f]{2}){5}$/i, 'A valid MAC address is required.');

/** Log selections are explicit IDs inside a time window in epoch milliseconds; "all" and "exclude" are never sent. */
export const logSelectionSchema = z
    .object({
        logIds: z.array(idSchema).min(1, 'At least one log ID is required.').max(1000),
        startTime: z.number().int().nonnegative(),
        endTime: z.number().int().nonnegative(),
    })
    .strict()
    .refine((value) => value.startTime < value.endTime, 'startTime must be before endTime.');

/**
 * The v2 log notification body. The controller accepts it only complete and exactly as read (including shortMsg),
 * so callers send the full current object with their changes applied.
 */
export const logNotificationBodySchema = z
    .object({
        webhookConfig: z.object({ webhookEnable: z.boolean() }).passthrough(),
        alertNotifications: z.array(z.object({ key: z.string().min(1) }).passthrough()),
        eventNotifications: z.array(z.object({ key: z.string().min(1) }).passthrough()),
    })
    .passthrough();

/**
 * Log administration: notification settings (v2 and audit), resets, alert resolution, log deletion by ID,
 * per-AP SSID override audit logs and failed-upgrade details.
 *
 * Every route is verified against docs/openapi (see tests/omadaClient/logAdmin.test.ts).
 */
export class LogAdminOperations {
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

    // ---- Reads ----
    public async listApSsidOverrideAuditLogs(apMac: string, page: number, pageSize: number, siteId?: string, h?: CustomHeaders): Promise<unknown> {
        const resolvedSiteId = await this.siteSegment(siteId);
        const url = this.buildPath(`/sites/${resolvedSiteId}/audit-logs/${mac(apMac)}/ssid-overrides`);
        return await this.call({ url, method: 'GET', params: { page, pageSize } }, h);
    }
    public async listFailedUpgradeDevices(upgradeLogId: string, page: number, pageSize: number, h?: CustomHeaders): Promise<unknown> {
        const url = this.buildPath(`/logs/${seg(upgradeLogId)}/upgrade/overview/failed-devices`);
        return await this.call({ url, method: 'GET', params: { page, pageSize } }, h);
    }
    public async getFailedUpgradeFirmware(upgradeLogId: string, h?: CustomHeaders): Promise<unknown> {
        return await this.call({ url: this.buildPath(`/logs/${seg(upgradeLogId)}/upgrade/overview/failed-model-firmware`), method: 'GET' }, h);
    }

    // ---- Notification settings ----
    public async setGlobalLogNotifications(body: In<typeof logNotificationBodySchema>, h?: CustomHeaders): Promise<unknown> {
        const data = logNotificationBodySchema.parse(body);
        return await this.call({ url: this.buildPath('/log-notification', 'v2'), method: 'PATCH', data }, h);
    }
    public async setSiteLogNotifications(body: In<typeof logNotificationBodySchema>, siteId?: string, h?: CustomHeaders): Promise<unknown> {
        const resolvedSiteId = await this.siteSegment(siteId);
        const data = logNotificationBodySchema.parse(body);
        return await this.call({ url: this.buildPath(`/sites/${resolvedSiteId}/site/log-notification`, 'v2'), method: 'PATCH', data }, h);
    }
    public async setGlobalAuditNotifications(
        payload: In<typeof schemas.auditLogNotificationSettingEditOpenApiVOSchema>,
        h?: CustomHeaders
    ): Promise<unknown> {
        const data = schemas.auditLogNotificationSettingEditOpenApiVOSchema.parse(payload);
        return await this.call({ url: this.buildPath('/audit-notification'), method: 'PATCH', data }, h);
    }
    public async setSiteAuditNotifications(
        payload: In<typeof schemas.auditLogNotificationSettingEditOpenApiVOSchema>,
        siteId?: string,
        h?: CustomHeaders
    ): Promise<unknown> {
        const resolvedSiteId = await this.siteSegment(siteId);
        const data = schemas.auditLogNotificationSettingEditOpenApiVOSchema.parse(payload);
        return await this.call({ url: this.buildPath(`/sites/${resolvedSiteId}/site/audit-notification`), method: 'PATCH', data }, h);
    }
    public async resetGlobalLogNotifications(h?: CustomHeaders): Promise<unknown> {
        return await this.call({ url: this.buildPath('/reset/log-notification'), method: 'POST' }, h);
    }
    public async resetSiteLogNotifications(siteId?: string, h?: CustomHeaders): Promise<unknown> {
        const resolvedSiteId = await this.siteSegment(siteId);
        return await this.call({ url: this.buildPath(`/sites/${resolvedSiteId}/site/reset/log-notification`), method: 'POST' }, h);
    }

    // ---- Alerts and log deletion (explicit IDs only) ----
    public async resolveSiteAlerts(selection: In<typeof logSelectionSchema>, siteId?: string, h?: CustomHeaders): Promise<unknown> {
        const resolvedSiteId = await this.siteSegment(siteId);
        return await this.call(
            { url: this.buildPath(`/sites/${resolvedSiteId}/logs/alerts/resolve`), method: 'POST', data: selectionBody(selection) },
            h
        );
    }
    public async deleteSiteEventLogs(selection: In<typeof logSelectionSchema>, siteId?: string, h?: CustomHeaders): Promise<unknown> {
        const resolvedSiteId = await this.siteSegment(siteId);
        return await this.call(
            { url: this.buildPath(`/sites/${resolvedSiteId}/logs/events/delete`), method: 'DELETE', data: selectionBody(selection) },
            h
        );
    }
    public async deleteSiteAlertLogs(selection: In<typeof logSelectionSchema>, siteId?: string, h?: CustomHeaders): Promise<unknown> {
        const resolvedSiteId = await this.siteSegment(siteId);
        return await this.call(
            { url: this.buildPath(`/sites/${resolvedSiteId}/logs/alerts/delete`), method: 'DELETE', data: selectionBody(selection) },
            h
        );
    }
    public async deleteGlobalEventLogs(selection: In<typeof logSelectionSchema>, h?: CustomHeaders): Promise<unknown> {
        return await this.call({ url: this.buildPath('/logs/events/delete'), method: 'DELETE', data: selectionBody(selection) }, h);
    }
    public async deleteGlobalAlertLogs(selection: In<typeof logSelectionSchema>, h?: CustomHeaders): Promise<unknown> {
        return await this.call({ url: this.buildPath('/logs/alerts/delete'), method: 'DELETE', data: selectionBody(selection) }, h);
    }
}

function selectionBody(selection: In<typeof logSelectionSchema>): Record<string, unknown> {
    const { logIds, startTime, endTime } = logSelectionSchema.parse(selection);
    return { logs: logIds, selectType: 'include', startTime, endTime };
}

function seg(value: string): string {
    return encodeURIComponent(idSchema.parse(value));
}

function mac(value: string): string {
    return encodeURIComponent(macPathSchema.parse(value));
}
