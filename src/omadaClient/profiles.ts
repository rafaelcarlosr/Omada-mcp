import { z } from 'zod';

import type { CustomHeaders, OmadaApiResponse } from '../types/index.js';
import type { RequestHandler } from './request.js';
import * as schemas from './requestSchemas.js';
import type { SiteOperations } from './site.js';

type Method = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

const idSchema = z.string().trim().min(1, 'An identifier is required.');
const SERVICE_PORT_KEYS = ['sourceStartPort', 'sourceEndPort', 'destStartPort', 'destEndPort'] as const;
const SERVICE_KEYS = [...SERVICE_PORT_KEYS, 'type', 'code', 'protoNum'] as const;

/**
 * Gateway QoS service type. The controller keeps only the fields of the chosen protocol (ports for TCP/UDP,
 * type and code for ICMP, protoNum for Other) and silently drops the rest, so other fields are refused.
 */
export const serviceTypePayloadSchema = schemas.gatewayQosServiceOpenApiVOSchema.superRefine((value, ctx) => {
    if (value.protocol < 0 || value.protocol > 4) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['protocol'], message: 'protocol must be 0 TCP, 1 UDP, 2 TCP/UDP, 3 ICMP or 4 Other.' });
        return;
    }
    const allowed: readonly string[] = value.protocol <= 2 ? SERVICE_PORT_KEYS : value.protocol === 3 ? ['type', 'code'] : ['protoNum'];
    for (const key of SERVICE_KEYS) {
        if (value[key] !== undefined && !allowed.includes(key)) {
            ctx.addIssue({ code: z.ZodIssueCode.custom, path: [key], message: `${key} does not apply to protocol ${value.protocol}.` });
        }
        if (value[key] === undefined && allowed.includes(key)) {
            ctx.addIssue({ code: z.ZodIssueCode.custom, path: [key], message: `${key} is required for protocol ${value.protocol}.` });
        }
    }
});

/** Bonjour service. The official spec puts the 1-3 limit on each service ID instead of on the list. */
export const bonjourServicePayloadSchema = schemas.bonjourServiceOpenApiVOSchema.extend({
    serviceIds: z
        .array(z.string().regex(/^_[a-z0-9_-]+\._[a-z]+\.local$/, 'Service IDs look like _airplay._tcp.local (lowercase).'))
        .min(1)
        .max(3)
        .describe('1 to 3 Bonjour service IDs in "_A._B.local" form, e.g. _airplay._tcp.local.'),
});

/** Wi-Fi calling profile. The controller needs a name although the spec marks it optional. */
export const wifiCallingProfilePayloadSchema = schemas.createWifiCallingProfileOpenApiVOSchema.extend({
    name: z.string().min(1).max(32).describe('Wi-Fi calling profile name, 1 to 32 characters.'),
});

export const wifiCallingCopySchema = schemas.copyWifiCallingProfileOpenApiVOSchema.extend({
    name: z.string().min(1).max(32).describe('Name of the copy, 1 to 32 characters.'),
});

/** OUI profile. The controller stores OUIs in upper case, so they are sent that way. */
export const ouiProfilePayloadSchema = schemas.ouiProfileOpenApiVOSchema
    .extend({
        ouiCombine: z
            .array(
                z
                    .object({
                        oui: z.string().regex(/^[0-9a-f]{2}-[0-9a-f]{2}-[0-9a-f]{2}$/i, 'An OUI looks like 00-1B-63.'),
                        description: z.string().min(1).max(128).optional(),
                    })
                    .strict()
            )
            .optional()
            .describe('OUIs (first three MAC bytes, e.g. 00-1B-63) with optional descriptions.'),
    })
    .transform((value) => ({
        ...value,
        ...(value.ouiCombine ? { ouiCombine: value.ouiCombine.map((entry) => ({ ...entry, oui: entry.oui.toUpperCase() })) } : {}),
    }));

type In<S extends z.ZodTypeAny> = z.input<S>;

/**
 * Site profiles that need no adopted device: rate limit, gateway QoS service types, Bonjour services,
 * APN, Wi-Fi calling and OUI profiles, plus the reads of switch OUI-based VLAN rules.
 *
 * Every route is verified against docs/openapi (see tests/omadaClient/profiles.test.ts).
 */
export class ProfileOperations {
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

    // ---- Rate limit profiles ----
    public async createRateLimitProfile(
        payload: In<typeof schemas.createRateLimitProfileOpenApiVOSchema>,
        siteId?: string,
        h?: CustomHeaders
    ): Promise<unknown> {
        return await this.send('POST', siteId, '/rate-limit-profiles', schemas.createRateLimitProfileOpenApiVOSchema.parse(payload), h);
    }
    public async updateRateLimitProfile(
        profileId: string,
        payload: In<typeof schemas.updateRateLimitProfileOpenApiVOSchema>,
        siteId?: string,
        h?: CustomHeaders
    ): Promise<unknown> {
        return await this.send(
            'PUT',
            siteId,
            `/rate-limit-profile/${seg(profileId)}`,
            schemas.updateRateLimitProfileOpenApiVOSchema.parse(payload),
            h
        );
    }
    public async deleteRateLimitProfile(profileId: string, siteId?: string, h?: CustomHeaders): Promise<unknown> {
        return await this.send('DELETE', siteId, `/rate-limit-profile/${seg(profileId)}`, undefined, h);
    }

    // ---- Gateway QoS service types ----
    public async createServiceType(payload: In<typeof serviceTypePayloadSchema>, siteId?: string, h?: CustomHeaders): Promise<unknown> {
        return await this.send('POST', siteId, '/profiles/service-type', serviceTypePayloadSchema.parse(payload), h);
    }
    public async updateServiceType(id: string, payload: In<typeof serviceTypePayloadSchema>, siteId?: string, h?: CustomHeaders): Promise<unknown> {
        return await this.send('PUT', siteId, `/profiles/service-type/${seg(id)}`, serviceTypePayloadSchema.parse(payload), h);
    }
    public async deleteServiceType(id: string, siteId?: string, h?: CustomHeaders): Promise<unknown> {
        return await this.send('DELETE', siteId, `/profiles/service-type/${seg(id)}`, undefined, h);
    }

    // ---- Bonjour (mDNS) services ----
    public async createMdnsProfile(payload: In<typeof bonjourServicePayloadSchema>, siteId?: string, h?: CustomHeaders): Promise<unknown> {
        return await this.send('POST', siteId, '/profiles/bonjour-service', bonjourServicePayloadSchema.parse(payload), h);
    }
    public async updateMdnsProfile(
        id: string,
        payload: In<typeof bonjourServicePayloadSchema>,
        siteId?: string,
        h?: CustomHeaders
    ): Promise<unknown> {
        return await this.send('PUT', siteId, `/profiles/bonjour-service/${seg(id)}`, bonjourServicePayloadSchema.parse(payload), h);
    }
    public async deleteMdnsProfile(id: string, siteId?: string, h?: CustomHeaders): Promise<unknown> {
        return await this.send('DELETE', siteId, `/profiles/bonjour-service/${seg(id)}`, undefined, h);
    }

    // ---- APN profiles ----
    public async listApnProfiles(siteId?: string, h?: CustomHeaders): Promise<unknown> {
        return await this.send('GET', siteId, '/profiles/apn', undefined, h);
    }
    public async createApnProfile(payload: In<typeof schemas.apnProfileConfigSchema>, siteId?: string, h?: CustomHeaders): Promise<unknown> {
        return await this.send('POST', siteId, '/profiles/apn', schemas.apnProfileConfigSchema.parse(payload), h);
    }
    public async updateApnProfile(
        profileId: string,
        payload: In<typeof schemas.apnProfileConfigSchema>,
        siteId?: string,
        h?: CustomHeaders
    ): Promise<unknown> {
        return await this.send('PUT', siteId, `/profiles/apn/${seg(profileId)}`, schemas.apnProfileConfigSchema.parse(payload), h);
    }
    public async deleteApnProfile(profileId: string, siteId?: string, h?: CustomHeaders): Promise<unknown> {
        return await this.send('DELETE', siteId, `/profiles/apn/${seg(profileId)}`, undefined, h);
    }

    // ---- Wi-Fi calling profiles ----
    public async listWifiCallingProfiles(siteId?: string, h?: CustomHeaders): Promise<unknown> {
        return await this.send('GET', siteId, '/profiles/wifi-calling', undefined, h);
    }
    public async createWifiCallingProfile(payload: In<typeof wifiCallingProfilePayloadSchema>, siteId?: string, h?: CustomHeaders): Promise<unknown> {
        return await this.send('POST', siteId, '/profiles/wifi-calling', wifiCallingProfilePayloadSchema.parse(payload), h);
    }
    public async copyWifiCallingProfile(
        profileId: string,
        payload: In<typeof wifiCallingCopySchema>,
        siteId?: string,
        h?: CustomHeaders
    ): Promise<unknown> {
        return await this.send('POST', siteId, `/profiles/wifi-calling/${seg(profileId)}/copy`, wifiCallingCopySchema.parse(payload), h);
    }
    public async updateWifiCallingProfile(
        profileId: string,
        payload: In<typeof wifiCallingProfilePayloadSchema>,
        siteId?: string,
        h?: CustomHeaders
    ): Promise<unknown> {
        return await this.send('PATCH', siteId, `/profiles/wifi-calling/${seg(profileId)}`, wifiCallingProfilePayloadSchema.parse(payload), h);
    }
    public async deleteWifiCallingProfile(profileId: string, siteId?: string, h?: CustomHeaders): Promise<unknown> {
        return await this.send('DELETE', siteId, `/profiles/wifi-calling/${seg(profileId)}`, undefined, h);
    }

    // ---- OUI profiles ----
    public async listOuiProfileSummaries(siteId?: string, h?: CustomHeaders): Promise<unknown> {
        return await this.send('GET', siteId, '/oui-profiles/all', undefined, h);
    }
    public async createOuiProfile(payload: In<typeof ouiProfilePayloadSchema>, siteId?: string, h?: CustomHeaders): Promise<unknown> {
        return await this.send('POST', siteId, '/oui-profiles', ouiProfilePayloadSchema.parse(payload), h);
    }
    public async updateOuiProfile(ouiId: string, payload: In<typeof ouiProfilePayloadSchema>, siteId?: string, h?: CustomHeaders): Promise<unknown> {
        return await this.send('PUT', siteId, `/oui-profiles/${seg(ouiId)}`, ouiProfilePayloadSchema.parse(payload), h);
    }
    public async deleteOuiProfile(ouiId: string, siteId?: string, h?: CustomHeaders): Promise<unknown> {
        return await this.send('DELETE', siteId, `/oui-profiles/${seg(ouiId)}`, undefined, h);
    }

    // ---- Switch OUI-based VLAN reads ----
    public async listSwitchOuiRules(siteId?: string, h?: CustomHeaders): Promise<unknown[]> {
        return await this.list(siteId, '/switch-oui-rules', h);
    }
    public async listSwitchOuiValidVlans(siteId?: string, h?: CustomHeaders): Promise<unknown[]> {
        return await this.list(siteId, '/switch-oui-rules/valid-vlans', h);
    }
    public async listSwitchOuiRuleSwitches(page: number, pageSize: number, siteId?: string, h?: CustomHeaders): Promise<unknown> {
        return await this.send('GET', siteId, `/switch-oui-rules/switches?page=${page}&pageSize=${pageSize}`, undefined, h);
    }
    public async listSwitchOuiSupportedSwitches(page: number, pageSize: number, siteId?: string, h?: CustomHeaders): Promise<unknown> {
        return await this.send('GET', siteId, `/switch-oui-rules/support-device?page=${page}&pageSize=${pageSize}`, undefined, h);
    }
    public async listSwitchOuiAutoAddVlanSwitches(page: number, pageSize: number, siteId?: string, h?: CustomHeaders): Promise<unknown> {
        return await this.send('GET', siteId, `/switch-oui-rules/switches/support-auto-add-vlan?page=${page}&pageSize=${pageSize}`, undefined, h);
    }
    public async getSwitchOuiAutoAddVlan(siteId?: string, h?: CustomHeaders): Promise<unknown> {
        return await this.send('GET', siteId, '/switch-oui-rules/whether-auto-add-vlan', undefined, h);
    }
    public async getSwitchOuiAutoAddVlanAllSupport(siteId?: string, h?: CustomHeaders): Promise<unknown> {
        return await this.send('GET', siteId, '/switch-oui-rules/auto-add-vlan-all-support', undefined, h);
    }
}

function seg(value: string): string {
    return encodeURIComponent(idSchema.parse(value));
}
