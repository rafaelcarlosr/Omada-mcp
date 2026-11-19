import { z } from 'zod';

import type { CustomHeaders, OmadaApiResponse } from '../types/index.js';
import type { RequestHandler } from './request.js';
import * as schemas from './requestSchemas.js';
import type { SiteOperations } from './site.js';

type Method = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
type In<S extends z.ZodTypeAny> = z.input<S>;

const idSchema = z.string().trim().min(1, 'An identifier is required.');

/**
 * SSID configuration sections patched by SSID ID, with their official request schemas. Rate control uses the
 * WLAN-scoped route because controller 6.3 answers HTTP 500 on the by-site rate-control route for any body.
 */
export const SSID_SECTIONS = {
    'band-steer': schemas.updateSsidBandSteerOpenApiVOSchema,
    'dhcp-option': schemas.updateSsidDhcpOptionOpenApiVOSchema,
    enable: schemas.updateSsidEnableStatusOpenApiVOSchema,
    hotspotv2: schemas.updateSsidHotspotV2SettingOpenApiVOSchema,
    'load-balance': schemas.updateSsidLoadBalanceOpenApiVOSchema,
    'mac-filter': schemas.updateSsidMacFilterOpenApiVOSchema,
    'multicast-config': schemas.updateSsidMultiCastOpenApiVOSchema,
    'rate-control': schemas.updateSsidRateControlOpenApiVOSchema,
    'rate-limit': schemas.updateSsidRateLimitOpenApiVOSchema,
    'wifi-calling': schemas.updateWifiCallingOpenApiVOSchema,
    'wlan-schedule': schemas.updateSsidWlanScheduleOpenApiVOSchema,
} as const;
export type SsidSection = keyof typeof SSID_SECTIONS;
export const ssidSectionSchema = z.enum(Object.keys(SSID_SECTIONS) as [SsidSection, ...SsidSection[]]);
type ByIdSection = Exclude<SsidSection, 'rate-control'>;

/**
 * SSIDs by ID (detail, section settings, AP group binding) and AP groups. These need no adopted AP.
 *
 * Every route is verified against docs/openapi (see tests/omadaClient/wireless.test.ts).
 */
export class WirelessOperations {
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

    /** All pages; the 6.3 AP group routes accept at most 100 rows per page. */
    private async list(siteId: string | undefined, suffix: string, customHeaders?: CustomHeaders): Promise<unknown[]> {
        return await this.request.fetchPaginated<unknown>(await this.sitePath(siteId, suffix), {}, customHeaders, 100);
    }

    // ---- SSIDs by ID ----
    public async getSsidConfig(ssidId: string, siteId?: string, h?: CustomHeaders): Promise<unknown> {
        return await this.send('GET', siteId, `/wireless-network/ssids/${seg(ssidId)}`, undefined, h);
    }
    public async listDuplicateSsidNames(siteId?: string, h?: CustomHeaders): Promise<unknown> {
        return await this.send('GET', siteId, '/wireless-network/ssids/duplicate-name', undefined, h);
    }
    public async listSsidApGroups(ssidId: string, siteId?: string, h?: CustomHeaders): Promise<unknown> {
        return await this.send('GET', siteId, `/wireless-network/ssids/${seg(ssidId)}/ap-groups`, undefined, h);
    }
    public async setSsidApGroups(ssidId: string, apGroupIds: string[], siteId?: string, h?: CustomHeaders): Promise<unknown> {
        const body = schemas.updateSsidBindApGroupOpenApiVOSchema.parse({ apGroupIds });
        return await this.send('PATCH', siteId, `/wireless-network/ssids/${seg(ssidId)}/ap-groups`, body, h);
    }
    public async setSsidSection(
        ssidId: string,
        section: ByIdSection,
        payload: In<(typeof SSID_SECTIONS)[ByIdSection]>,
        siteId?: string,
        h?: CustomHeaders
    ): Promise<unknown> {
        if (!(section in SSID_SECTIONS) || section === ('rate-control' as SsidSection)) {
            throw new Error(`Unsupported SSID section "${String(section)}".`);
        }
        const body = SSID_SECTIONS[section].parse(payload);
        return await this.send('PATCH', siteId, `/wireless-network/ssids/${seg(ssidId)}/${section}`, body, h);
    }
    public async setSsidRateControl(
        wlanId: string,
        ssidId: string,
        payload: In<typeof schemas.updateSsidRateControlOpenApiVOSchema>,
        siteId?: string,
        h?: CustomHeaders
    ): Promise<unknown> {
        const body = schemas.updateSsidRateControlOpenApiVOSchema.parse(payload);
        return await this.send('PATCH', siteId, `/wireless-network/wlans/${seg(wlanId)}/ssids/${seg(ssidId)}/update-rate-control`, body, h);
    }

    // ---- AP groups ----
    public async listApGroups(siteId?: string, h?: CustomHeaders): Promise<unknown[]> {
        return await this.list(siteId, '/ap-groups', h);
    }
    public async getApGroup(apGroupId: string, siteId?: string, h?: CustomHeaders): Promise<unknown> {
        return await this.send('GET', siteId, `/ap-groups/${seg(apGroupId)}/info`, undefined, h);
    }
    public async listApGroupAps(siteId?: string, h?: CustomHeaders): Promise<unknown[]> {
        return await this.list(siteId, '/ap-groups/aps', h);
    }
    public async getApGroupCount(siteId?: string, h?: CustomHeaders): Promise<unknown> {
        return await this.send('GET', siteId, '/count-ap-groups', undefined, h);
    }
    public async createApGroup(payload: In<typeof schemas.createApGroupOpenApiVOSchema>, siteId?: string, h?: CustomHeaders): Promise<unknown> {
        return await this.send('POST', siteId, '/ap-groups', schemas.createApGroupOpenApiVOSchema.parse(payload), h);
    }
    public async updateApGroup(
        apGroupId: string,
        payload: In<typeof schemas.updateApGroupOpenApiVOSchema>,
        siteId?: string,
        h?: CustomHeaders
    ): Promise<unknown> {
        return await this.send('PATCH', siteId, `/ap-groups/${seg(apGroupId)}`, schemas.updateApGroupOpenApiVOSchema.parse(payload), h);
    }
    public async deleteApGroup(apGroupId: string, siteId?: string, h?: CustomHeaders): Promise<unknown> {
        return await this.send('DELETE', siteId, `/ap-groups/${seg(apGroupId)}`, undefined, h);
    }
}

function seg(value: string): string {
    return encodeURIComponent(idSchema.parse(value));
}
