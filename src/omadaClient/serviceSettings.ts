import { z } from 'zod';

import type { CustomHeaders, OmadaApiResponse } from '../types/index.js';
import type { RequestHandler } from './request.js';
import * as schemas from './requestSchemas.js';
import type { SiteOperations } from './site.js';

type Method = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
type In<S extends z.ZodTypeAny> = z.input<S>;

const idSchema = z.string().trim().min(1, 'An identifier is required.');
const indexesSchema = z
    .record(z.string().min(1), z.number().int().min(1))
    .refine((value) => Object.keys(value).length > 0, 'At least one index is required.');

/** SSH setting: the spec allows port 22 or 1025-65535, but its generated range drops 22. */
export const sshSettingPayloadSchema = schemas.sSHSettingSchema.extend({
    sshServerPort: z
        .number()
        .int()
        .refine((port) => port === 22 || (port >= 1025 && port <= 65535), 'sshServerPort must be 22 or within 1025-65535.')
        .optional(),
});

/**
 * Site service settings that need no adopted device: session limits and their rules, bandwidth control,
 * LLDP, site remote logging, SSH, MAC-based authentication, MAC filtering, EAP 802.1X and rule ordering.
 *
 * Every route is verified against docs/openapi (see tests/omadaClient/serviceSettings.test.ts).
 */
export class ServiceSettingOperations {
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
        return await this.request.fetchPaginated<unknown>(await this.sitePath(siteId, suffix), {}, customHeaders, 100);
    }

    // ---- Session limits ----
    public async setSessionLimit(payload: In<typeof schemas.sessionLimitEntitySchema>, siteId?: string, h?: CustomHeaders): Promise<unknown> {
        return await this.send('PATCH', siteId, '/session-limit', schemas.sessionLimitEntitySchema.parse(payload), h);
    }
    public async createSessionLimitRule(
        payload: In<typeof schemas.sessionLimitRuleOpenApiVOSchema>,
        siteId?: string,
        h?: CustomHeaders
    ): Promise<unknown> {
        return await this.send('POST', siteId, '/session-limit/rules', schemas.sessionLimitRuleOpenApiVOSchema.parse(payload), h);
    }
    public async updateSessionLimitRule(
        ruleId: string,
        payload: In<typeof schemas.sessionLimitRuleOpenApiVOSchema>,
        siteId?: string,
        h?: CustomHeaders
    ): Promise<unknown> {
        return await this.send('PATCH', siteId, `/session-limit/rules/${seg(ruleId)}`, schemas.sessionLimitRuleOpenApiVOSchema.parse(payload), h);
    }
    public async deleteSessionLimitRule(ruleId: string, siteId?: string, h?: CustomHeaders): Promise<unknown> {
        return await this.send('DELETE', siteId, `/session-limit/rules/${seg(ruleId)}`, undefined, h);
    }
    public async reorderSessionLimitRules(indexes: Record<string, number>, siteId?: string, h?: CustomHeaders): Promise<unknown> {
        return await this.send('PATCH', siteId, '/session-limit/rules', { indexes: indexesSchema.parse(indexes) }, h);
    }

    // ---- Bandwidth control and policy routing order ----
    public async setBandwidthControl(payload: In<typeof schemas.bandwidthControlSchema>, siteId?: string, h?: CustomHeaders): Promise<unknown> {
        return await this.send('PATCH', siteId, '/bandwidth-control', schemas.bandwidthControlSchema.parse(payload), h);
    }
    public async reorderBandwidthControlRules(indexes: Record<string, number>, siteId?: string, h?: CustomHeaders): Promise<unknown> {
        return await this.send('PATCH', siteId, '/bandwidth-control/rules', { indexes: indexesSchema.parse(indexes) }, h);
    }
    public async reorderPolicyRoutes(indexes: Record<string, number>, siteId?: string, h?: CustomHeaders): Promise<unknown> {
        return await this.send('POST', siteId, '/routing/policy-routings/modifyIndex', { indexes: indexesSchema.parse(indexes) }, h);
    }

    // ---- LLDP, remote logging, SSH ----
    public async setLldpSetting(payload: In<typeof schemas.siteLldpSettingSchema>, siteId?: string, h?: CustomHeaders): Promise<unknown> {
        return await this.send('PATCH', siteId, '/lldp', schemas.siteLldpSettingSchema.parse(payload), h);
    }
    public async getRemoteLoggingTip(siteId?: string, h?: CustomHeaders): Promise<unknown> {
        return await this.send('GET', siteId, '/remote-logging/tip', undefined, h);
    }
    public async setSiteRemoteLogging(
        payload: In<typeof schemas.siteRemoteLoggingSettingSchema>,
        siteId?: string,
        h?: CustomHeaders
    ): Promise<unknown> {
        return await this.send('PATCH', siteId, '/remote-logging', schemas.siteRemoteLoggingSettingSchema.parse(payload), h);
    }
    public async setSshSetting(payload: In<typeof sshSettingPayloadSchema>, siteId?: string, h?: CustomHeaders): Promise<unknown> {
        return await this.send('PUT', siteId, '/ssh', sshSettingPayloadSchema.parse(payload), h);
    }
    public async listSnmpIncompatibleDevices(siteId?: string, h?: CustomHeaders): Promise<unknown[]> {
        return await this.list(siteId, '/setting/service/snmp/incompatible-devices', h);
    }

    // ---- MAC authentication, MAC filtering, EAP 802.1X ----
    public async setMacAuthSetting(payload: In<typeof schemas.updateMacAuthOpenApiVOSchema>, siteId?: string, h?: CustomHeaders): Promise<unknown> {
        return await this.send('PATCH', siteId, '/mac-auth', schemas.updateMacAuthOpenApiVOSchema.parse(payload), h);
    }
    public async setMacFilteringGeneralSetting(
        payload: In<typeof schemas.macFilteringGeneralSettingSchema>,
        siteId?: string,
        h?: CustomHeaders
    ): Promise<unknown> {
        return await this.send('PATCH', siteId, '/mac-filter', schemas.macFilteringGeneralSettingSchema.parse(payload), h);
    }
    public async setEapDot1xSetting(payload: In<typeof schemas.dot1xEapOpenApiVOSchema>, siteId?: string, h?: CustomHeaders): Promise<unknown> {
        return await this.send('PATCH', siteId, '/dot1x/eap', schemas.dot1xEapOpenApiVOSchema.parse(payload), h);
    }
    public async listEapDot1xCandidates(siteId?: string, h?: CustomHeaders): Promise<unknown> {
        return await this.send('GET', siteId, '/dot1x/eap/candidates', undefined, h);
    }
    public async listSwitchDot1xCandidates(siteId?: string, h?: CustomHeaders): Promise<unknown> {
        return await this.send('GET', siteId, '/dot1x/candidates', undefined, h);
    }
}

function seg(value: string): string {
    return encodeURIComponent(idSchema.parse(value));
}
