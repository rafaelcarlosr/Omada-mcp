import type { AxiosRequestConfig } from 'axios';
import { z } from 'zod';

import type { CustomHeaders, OmadaApiResponse } from '../types/index.js';
import type { RequestHandler } from './request.js';
import * as schemas from './requestSchemas.js';
import type { SiteOperations } from './site.js';

type In<S extends z.ZodTypeAny> = z.input<S>;

const idSchema = z.string().trim().min(1, 'An identifier is required.');

/** Retention fields that can be changed; the available-day lists and the fixed 5-minute/10-minute/hourly values are read-only. */
export const controllerRetentionPayloadSchema = schemas.historyRetention21Schema.omit({
    override: true,
    knownClientAvailableRetentionDays: true,
    clientHistoryAvailableRetentionDays: true,
    dailyAvailableRetentionDays: true,
    weeklyAvailableRetentionDays: true,
    portalAuthAvailableRetentionDays: true,
    clientTrendAvailableRetentionDays: true,
    fiveMin: true,
    tenMin: true,
    hourly: true,
});

/** History data retention (maintenance route) without the MSP-only override flag. */
export const dataRetentionPayloadSchema = schemas.modifyHistoryRetentionOpenApiVO08Schema.omit({ override: true });

/** UI settings that apply to every controller; private labeling is Omada Pro only and macFormat is undocumented. */
export const uiInterfacePayloadSchema = schemas.uIInterface21Schema
    .pick({ timeZone: true, refreshRate: true })
    .partial()
    .refine((value) => Object.keys(value).length > 0, 'Send at least one of timeZone or refreshRate.');

/** Controller general settings; the DST fields that describe computed state are read-only. */
export const generalSettingsPayloadSchema = schemas.generalSetting21Schema.extend({
    dst: schemas.dstOpenApiVO21Schema.pick({ mode: true, start: true, end: true, offset: true }).optional(),
});

/** Client detail switches; the controller rejects updates that do not carry all four (-1). */
export const clientDetailPayloadSchema = schemas.clientDetailInformationSettingVO21Schema.required({
    clientRecognitionEnable: true,
    clientHealthEnable: true,
    clientHistoryEnable: true,
    clientDataTrendEnable: true,
});

/** RADIUS proxy. While disabled the controller keeps only the switch, so the proxy options need enable:true. */
export const radiusProxyPayloadSchema = schemas.radiusProxyServerSettingRequestBody21Schema.superRefine((value, ctx) => {
    if (value.enable) return;
    for (const key of ['requireMessageAuthenticator', 'limitProxyState'] as const) {
        if (value[key] !== undefined) ctx.addIssue({ code: 'custom', path: [key], message: `${key} is kept only while enable is true.` });
    }
});

/** Remote syslog. A disabled server keeps no host, so a host needs enable:true. */
export const remoteLoggingPayloadSchema = schemas.remoteLog21Schema.superRefine((value, ctx) => {
    if (value.enable && !value.host) ctx.addIssue({ code: 'custom', path: ['host'], message: 'host is required when enable is true.' });
    if (!value.enable && value.host !== undefined)
        ctx.addIssue({ code: 'custom', path: ['host'], message: 'host is kept only while enable is true.' });
});

const LOG_MODULES = ['otherModule', 'managerModule', 'clientModule', 'monitorModule', 'systemModule', 'accountModule', 'logModule'] as const;

/** Controller log levels. Module levels apply only with type CUSTOM, which needs all of them. */
export const controllerLoggingPayloadSchema = schemas.logLevel21Schema.required({ type: true }).superRefine((value, ctx) => {
    for (const key of LOG_MODULES) {
        if (value.type === 'AUTO' && value[key] !== undefined) {
            ctx.addIssue({ code: 'custom', path: [key], message: `${key} applies only with type CUSTOM.` });
        }
        if (value.type === 'CUSTOM' && value[key] === undefined) {
            ctx.addIssue({ code: 'custom', path: [key], message: `${key} is required with type CUSTOM.` });
        }
    }
});

const webhookUrls = z
    .array(
        z
            .string()
            .url()
            .regex(/^https?:\/\//, 'Webhook URLs start with http:// or https://.')
    )
    .min(1)
    .max(3)
    .describe('1 to 3 http(s) URLs that receive the webhook.');

export const webhookCreatePayloadSchema = schemas.openApiWebhookSettingAddVO21Schema.extend({ urlList: webhookUrls });
export const webhookUpdatePayloadSchema = schemas.openApiWebhookSettingEditVO21Schema.extend({ urlList: webhookUrls });
export const webhookTestPayloadSchema = schemas.openApiWebhookSettingTestVO21Schema.extend({ urlList: webhookUrls });

/**
 * Controller-wide settings: client timeouts, data retention, device access, UI, general settings, RADIUS proxy,
 * remote logging, log levels, client recognition and detail switches, webhooks, test mail and update checks.
 * The controller, portal and upgrade port writes are deliberately not implemented: a wrong value cuts access.
 *
 * Every route is verified against docs/openapi (see tests/omadaClient/controllerSettings.test.ts).
 */
export class ControllerSettingOperations {
    constructor(
        private readonly request: RequestHandler,
        private readonly site: SiteOperations,
        private readonly buildPath: (path: string) => string
    ) {}

    private async call(config: AxiosRequestConfig, customHeaders?: CustomHeaders): Promise<unknown> {
        return this.request.ensureSuccess(await this.request.request<OmadaApiResponse<unknown>>(config, true, customHeaders));
    }

    // ---- Settings ----
    public async setClientActiveTimeout(payload: In<typeof schemas.clientActiveTimeout21Schema>, h?: CustomHeaders): Promise<unknown> {
        const data = schemas.clientActiveTimeout21Schema.parse(payload);
        return await this.call({ url: this.buildPath('/controller/setting/active-timeout'), method: 'PATCH', data }, h);
    }
    public async setControllerRetention(payload: In<typeof controllerRetentionPayloadSchema>, h?: CustomHeaders): Promise<unknown> {
        const data = controllerRetentionPayloadSchema.parse(payload);
        return await this.call({ url: this.buildPath('/controller/setting/retention'), method: 'PATCH', data }, h);
    }
    public async setDataRetention(payload: In<typeof dataRetentionPayloadSchema>, h?: CustomHeaders): Promise<unknown> {
        return await this.call({ url: this.buildPath('/retention'), method: 'PATCH', data: dataRetentionPayloadSchema.parse(payload) }, h);
    }
    public async setDeviceAccessManagement(payload: In<typeof schemas.deviceAccessManagementVO21Schema>, h?: CustomHeaders): Promise<unknown> {
        const data = schemas.deviceAccessManagementVO21Schema.parse(payload);
        return await this.call({ url: this.buildPath('/controller/setting/services/device-access'), method: 'PATCH', data }, h);
    }
    public async setUiInterface(payload: In<typeof schemas.uIInterface21Schema>, h?: CustomHeaders): Promise<unknown> {
        const data = schemas.uIInterface21Schema.parse(payload);
        return await this.call({ url: this.buildPath('/controller/setting/ui-interface'), method: 'PATCH', data }, h);
    }
    public async setExperienceImprovement(payload: In<typeof schemas.experienceImprovementProgram21Schema>, h?: CustomHeaders): Promise<unknown> {
        const data = schemas.experienceImprovementProgram21Schema.parse(payload);
        return await this.call({ url: this.buildPath('/global/controller/setting/exp-improve'), method: 'PATCH', data }, h);
    }
    public async setGeneralSettings(payload: In<typeof generalSettingsPayloadSchema>, h?: CustomHeaders): Promise<unknown> {
        const data = generalSettingsPayloadSchema.parse(payload);
        return await this.call({ url: this.buildPath('/global/controller/setting/general'), method: 'PATCH', data }, h);
    }
    public async setRadiusProxy(payload: In<typeof radiusProxyPayloadSchema>, h?: CustomHeaders): Promise<unknown> {
        const data = radiusProxyPayloadSchema.parse(payload);
        return await this.call({ url: this.buildPath('/global/controller/setting/network/radius-proxy'), method: 'PATCH', data }, h);
    }
    public async setRemoteLogging(payload: In<typeof remoteLoggingPayloadSchema>, h?: CustomHeaders): Promise<unknown> {
        const data = remoteLoggingPayloadSchema.parse(payload);
        return await this.call({ url: this.buildPath('/global/controller/setting/syslog'), method: 'PATCH', data }, h);
    }
    public async setControllerLogging(payload: In<typeof controllerLoggingPayloadSchema>, h?: CustomHeaders): Promise<unknown> {
        const data = controllerLoggingPayloadSchema.parse(payload);
        return await this.call({ url: this.buildPath('/system/setting/logging'), method: 'PATCH', data }, h);
    }
    public async getClientRecognition(h?: CustomHeaders): Promise<unknown> {
        return await this.call({ url: this.buildPath('/controller/setting/client-recognition'), method: 'GET' }, h);
    }
    public async setClientRecognition(payload: In<typeof schemas.clientRecognitionEnableOpenApiVO21Schema>, h?: CustomHeaders): Promise<unknown> {
        const data = schemas.clientRecognitionEnableOpenApiVO21Schema.parse(payload);
        return await this.call({ url: this.buildPath('/controller/setting/client-recognition'), method: 'PATCH', data }, h);
    }
    public async getClientDetailInformation(h?: CustomHeaders): Promise<unknown> {
        return await this.call({ url: this.buildPath('/client-detail-information'), method: 'GET' }, h);
    }
    public async setClientDetailInformation(payload: In<typeof clientDetailPayloadSchema>, h?: CustomHeaders): Promise<unknown> {
        const data = clientDetailPayloadSchema.parse(payload);
        return await this.call({ url: this.buildPath('/client-detail-information'), method: 'PATCH', data }, h);
    }

    // ---- Reads ----
    public async getControllerDstInfo(h?: CustomHeaders): Promise<unknown> {
        return await this.call({ url: this.buildPath('/dst-info'), method: 'GET' }, h);
    }
    public async getSiteDstInfo(siteId?: string, h?: CustomHeaders): Promise<unknown> {
        const resolvedSiteId = encodeURIComponent(await this.site.resolveSiteId(siteId));
        return await this.call({ url: this.buildPath(`/sites/${resolvedSiteId}/dst-info`), method: 'GET' }, h);
    }
    public async getPrivacyPolicyStatus(h?: CustomHeaders): Promise<unknown> {
        return await this.call({ url: this.buildPath('/privacy-policy'), method: 'GET' }, h);
    }
    public async getUpgradePort(h?: CustomHeaders): Promise<unknown> {
        return await this.call({ url: this.buildPath('/system/setting/upgrade-port'), method: 'GET' }, h);
    }
    public async listGlobalGatewayWanStatus(page: number, pageSize: number, h?: CustomHeaders): Promise<unknown> {
        return await this.call({ url: this.buildPath('/global/gateways/wan-status'), method: 'GET', params: { page, pageSize } }, h);
    }

    // ---- Webhooks ----
    public async createWebhook(payload: In<typeof webhookCreatePayloadSchema>, h?: CustomHeaders): Promise<unknown> {
        return await this.call({ url: this.buildPath('/webhook/settings'), method: 'POST', data: webhookCreatePayloadSchema.parse(payload) }, h);
    }
    public async updateWebhook(webhookId: string, payload: In<typeof webhookUpdatePayloadSchema>, h?: CustomHeaders): Promise<unknown> {
        const data = webhookUpdatePayloadSchema.parse(payload);
        return await this.call({ url: this.buildPath(`/webhook/settings/${seg(webhookId)}`), method: 'PATCH', data }, h);
    }
    public async deleteWebhook(webhookId: string, h?: CustomHeaders): Promise<unknown> {
        return await this.call({ url: this.buildPath(`/webhook/settings/${seg(webhookId)}`), method: 'DELETE' }, h);
    }
    public async testWebhook(webhookId: string, payload: In<typeof webhookTestPayloadSchema>, h?: CustomHeaders): Promise<unknown> {
        const data = webhookTestPayloadSchema.parse(payload);
        return await this.call({ url: this.buildPath(`/webhook/settings/${seg(webhookId)}`), method: 'POST', data }, h);
    }

    // ---- Actions ----
    public async sendTestMail(payload: In<typeof schemas.sendMailServerOpenApiVO21Schema>, h?: CustomHeaders): Promise<unknown> {
        const data = schemas.sendMailServerOpenApiVO21Schema.parse(payload);
        return await this.call({ url: this.buildPath('/settings/test-mail'), method: 'POST', data }, h);
    }
    public async checkControllerUpdate(payload: In<typeof schemas.channelUpgrade21Schema>, h?: CustomHeaders): Promise<unknown> {
        const data = schemas.channelUpgrade21Schema.parse(payload);
        return await this.call({ url: this.buildPath('/system/setting/channel-update'), method: 'POST', data }, h);
    }
}

function seg(value: string): string {
    return encodeURIComponent(idSchema.parse(value));
}
