import { z } from 'zod';

import type { CustomHeaders, OmadaApiResponse } from '../types/index.js';
import type { RequestHandler } from './request.js';
import * as schemas from './requestSchemas.js';
import type { SiteOperations } from './site.js';

type Method = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
type In<S extends z.ZodTypeAny> = z.input<S>;

const idSchema = z.string().trim().min(1, 'An identifier is required.');

/** PoE schedule. The spec types poePortsMap as a bare object; its documented shape is switch MAC -> port numbers. */
export const poeSchedulePayloadSchema = schemas.poeScheduleOpenApiVOSchema.omit({ siteId: true }).extend({
    poePortsMap: z
        .record(z.string(), z.array(z.number().int().min(1)))
        .describe('Switch MAC -> list of PoE port numbers powered only inside the time range.'),
});

/** IP-MAC binding without the deprecated export flags; PATCH replaces the whole binding. */
export const ipMacBindingPayloadSchema = schemas.iPMacBindingSchema.omit({ exportToDhcpReservation: true, supportExport: true });

/** Site mail server without the read-only id and resource fields. */
export const mailServerPayloadSchema = schemas.mailServerOpenApiVOSchema.omit({ id: true, resource: true });

/** IoT radio setting without the read-only resource field. */
export const iotRadioPayloadSchema = schemas.iotRadioSettingOpenApiVOSchema.omit({ resource: true });

/** Intelli-recover automatic PoE recovery setting without the setting id. */
export const intelliRecoverPayloadSchema = schemas.intelliRecoverSettingSchema.omit({ id: true }).extend({
    limitNum: z
        .number()
        .int()
        .min(3)
        .max(10)
        .optional()
        .describe('Maximum PoE cycles of the uplink port per recovery, 3-10 (enforced by the controller).'),
});

/**
 * Site services and settings that need no adopted device: PoE schedules, IP-MAC bindings, IoT transport
 * streams, the site mail server, LED, multicast rate limit, remember-device, speed test schedule,
 * portal logout domain, IoT radio and intelli-recover settings, and the MLD read (its write needs a gateway).
 *
 * Every route is verified against docs/openapi (see tests/omadaClient/siteServices.test.ts).
 */
export class SiteServiceOperations {
    constructor(
        private readonly request: RequestHandler,
        private readonly site: SiteOperations,
        private readonly buildPath: (path: string, version?: string) => string
    ) {}

    private async sitePath(siteId: string | undefined, suffix: string): Promise<string> {
        const resolvedSiteId = await this.site.resolveSiteId(siteId);
        return this.buildPath(`/sites/${encodeURIComponent(resolvedSiteId)}${suffix}`);
    }

    private async send(method: Method, siteId: string | undefined, suffix: string, body: unknown, customHeaders?: CustomHeaders): Promise<unknown> {
        const url = await this.sitePath(siteId, suffix);
        const config = body === undefined ? { method, url } : { method, url, data: body };
        return this.request.ensureSuccess(await this.request.request<OmadaApiResponse<unknown>>(config, true, customHeaders));
    }

    private async list(siteId: string | undefined, suffix: string, customHeaders?: CustomHeaders): Promise<unknown[]> {
        return await this.request.fetchPaginated<unknown>(await this.sitePath(siteId, suffix), {}, customHeaders);
    }

    // ---- PoE schedules ----
    public async createPoeSchedule(payload: In<typeof poeSchedulePayloadSchema>, siteId?: string, h?: CustomHeaders): Promise<unknown> {
        return await this.send('POST', siteId, '/poe-schedules', poeSchedulePayloadSchema.parse(payload), h);
    }
    public async updatePoeSchedule(
        poeScheduleId: string,
        payload: In<typeof poeSchedulePayloadSchema>,
        siteId?: string,
        h?: CustomHeaders
    ): Promise<unknown> {
        return await this.send('PUT', siteId, `/poe-schedules/${seg(poeScheduleId)}`, poeSchedulePayloadSchema.parse(payload), h);
    }
    public async deletePoeSchedule(poeScheduleId: string, siteId?: string, h?: CustomHeaders): Promise<unknown> {
        return await this.send('DELETE', siteId, `/poe-schedules/${seg(poeScheduleId)}`, undefined, h);
    }

    // ---- IP-MAC bindings ----
    public async createIpMacBinding(payload: In<typeof ipMacBindingPayloadSchema>, siteId?: string, h?: CustomHeaders): Promise<unknown> {
        return await this.send('POST', siteId, '/ip-mac-binds', ipMacBindingPayloadSchema.parse(payload), h);
    }
    public async updateIpMacBinding(
        bindId: string,
        payload: In<typeof ipMacBindingPayloadSchema>,
        siteId?: string,
        h?: CustomHeaders
    ): Promise<unknown> {
        return await this.send('PATCH', siteId, `/ip-mac-binds/${seg(bindId)}`, ipMacBindingPayloadSchema.parse(payload), h);
    }
    public async deleteIpMacBinding(bindId: string, siteId?: string, h?: CustomHeaders): Promise<unknown> {
        return await this.send('DELETE', siteId, `/ip-mac-binds/${seg(bindId)}`, undefined, h);
    }

    // ---- IoT transport streams ----
    public async listIotServers(siteId?: string, h?: CustomHeaders): Promise<unknown[]> {
        return await this.list(siteId, '/setting/iot/servers', h);
    }
    public async createIotServer(payload: In<typeof schemas.configIotServerOpenApiVOSchema>, siteId?: string, h?: CustomHeaders): Promise<unknown> {
        return await this.send('POST', siteId, '/setting/iot/servers', schemas.configIotServerOpenApiVOSchema.parse(payload), h);
    }
    public async updateIotServer(
        id: string,
        payload: In<typeof schemas.configIotServerOpenApiVOSchema>,
        siteId?: string,
        h?: CustomHeaders
    ): Promise<unknown> {
        return await this.send('PUT', siteId, `/setting/iot/servers/${seg(id)}`, schemas.configIotServerOpenApiVOSchema.parse(payload), h);
    }
    public async deleteIotServer(id: string, siteId?: string, h?: CustomHeaders): Promise<unknown> {
        return await this.send('DELETE', siteId, `/setting/iot/servers/${seg(id)}`, undefined, h);
    }

    // ---- Site mail server (one per site, no delete route) ----
    public async getSiteMailServer(siteId?: string, h?: CustomHeaders): Promise<unknown> {
        return await this.send('GET', siteId, '/setting/mails', undefined, h);
    }
    public async createSiteMailServer(payload: In<typeof mailServerPayloadSchema>, siteId?: string, h?: CustomHeaders): Promise<unknown> {
        return await this.send('POST', siteId, '/setting/mails', mailServerPayloadSchema.parse(payload), h);
    }
    public async updateSiteMailServer(
        mailId: string,
        payload: In<typeof mailServerPayloadSchema>,
        siteId?: string,
        h?: CustomHeaders
    ): Promise<unknown> {
        return await this.send('PATCH', siteId, `/setting/mails/${seg(mailId)}`, mailServerPayloadSchema.parse(payload), h);
    }

    // ---- Site settings ----
    public async setSiteLed(payload: In<typeof schemas.siteLedSettingSchema>, siteId?: string, h?: CustomHeaders): Promise<unknown> {
        return await this.send('PUT', siteId, '/led', schemas.siteLedSettingSchema.parse(payload), h);
    }
    public async setMulticastRateLimit(
        payload: In<typeof schemas.siteMulticastRateLimitSettingSchema>,
        siteId?: string,
        h?: CustomHeaders
    ): Promise<unknown> {
        return await this.send('PATCH', siteId, '/multicast-rate-limit', schemas.siteMulticastRateLimitSettingSchema.parse(payload), h);
    }
    public async setSiteRememberSetting(
        payload: In<typeof schemas.siteRememberDeviceSettingSchema>,
        siteId?: string,
        h?: CustomHeaders
    ): Promise<unknown> {
        return await this.send('POST', siteId, '/remember-device', schemas.siteRememberDeviceSettingSchema.parse(payload), h);
    }
    public async getMldSetting(siteId?: string, h?: CustomHeaders): Promise<unknown> {
        return await this.send('GET', siteId, '/setting/service/mld', undefined, h);
    }
    public async getSpeedTestSetting(siteId?: string, h?: CustomHeaders): Promise<unknown> {
        return await this.send('GET', siteId, '/setting/speedTest', undefined, h);
    }
    public async setSpeedTestSetting(
        payload: In<typeof schemas.modifySpeedTestV2SettingOpenApiVOSchema>,
        siteId?: string,
        h?: CustomHeaders
    ): Promise<unknown> {
        return await this.send('POST', siteId, '/setting/speedTest', schemas.modifySpeedTestV2SettingOpenApiVOSchema.parse(payload), h);
    }
    public async getPortalLogoutSetting(siteId?: string, h?: CustomHeaders): Promise<unknown> {
        return await this.send('GET', siteId, '/portal-logout', undefined, h);
    }
    public async setPortalLogoutSetting(
        payload: In<typeof schemas.portalLogoutConfigOpenApiVOSchema>,
        siteId?: string,
        h?: CustomHeaders
    ): Promise<unknown> {
        return await this.send('PUT', siteId, '/portal-logout', schemas.portalLogoutConfigOpenApiVOSchema.parse(payload), h);
    }
    public async listPortalsWithLogout(siteId?: string, h?: CustomHeaders): Promise<unknown> {
        return await this.send('GET', siteId, '/portals/logout-enabled', undefined, h);
    }
    public async getIotRadioSetting(siteId?: string, h?: CustomHeaders): Promise<unknown> {
        return await this.send('GET', siteId, '/setting/iot/radio', undefined, h);
    }
    public async setIotRadioSetting(payload: In<typeof iotRadioPayloadSchema>, siteId?: string, h?: CustomHeaders): Promise<unknown> {
        return await this.send('PATCH', siteId, '/setting/iot/radio', iotRadioPayloadSchema.parse(payload), h);
    }
    public async getIntelliRecoverSetting(siteId?: string, h?: CustomHeaders): Promise<unknown> {
        return await this.send('GET', siteId, '/intelli-recover/auto-setting/config', undefined, h);
    }
    public async setIntelliRecoverSetting(payload: In<typeof intelliRecoverPayloadSchema>, siteId?: string, h?: CustomHeaders): Promise<unknown> {
        return await this.send('POST', siteId, '/intelli-recover/auto-setting/modify', intelliRecoverPayloadSchema.parse(payload), h);
    }
}

function seg(value: string): string {
    return encodeURIComponent(idSchema.parse(value));
}
