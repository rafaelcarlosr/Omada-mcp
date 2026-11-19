import { z } from 'zod';

import type { CustomHeaders, OmadaApiResponse } from '../types/index.js';
import type { RequestHandler } from './request.js';
import * as schemas from './requestSchemas.js';
import type { SiteOperations } from './site.js';

type Method = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
type In<S extends z.ZodTypeAny> = z.input<S>;

const idSchema = z.string().trim().min(1, 'An identifier is required.');

/** Fields controller 6.3 requires in portalCustomize but omits from reads while they hold their default. */
export const PORTAL_CUSTOMIZE_DEFAULTS = {
    defaultLanguage: 0,
    copyrightEnable: false,
    logoDisplay: false,
    termsOfServiceEnable: false,
    welcomeEnable: false,
} as const;

/**
 * Site portals (captive portal authentication), PPSK profiles and the reboot schedule list.
 *
 * Every route is verified against docs/openapi (see tests/omadaClient/portals.test.ts).
 */
export class PortalOperations {
    constructor(
        private readonly request: RequestHandler,
        private readonly site: SiteOperations,
        private readonly buildPath: (path: string, version?: string) => string
    ) {}

    private async sitePath(siteId: string | undefined, suffix: string, version?: string): Promise<string> {
        const resolvedSiteId = await this.site.resolveSiteId(siteId);
        return this.buildPath(`/sites/${encodeURIComponent(resolvedSiteId)}${suffix}`, version);
    }

    private async send(
        method: Method,
        siteId: string | undefined,
        suffix: string,
        body: unknown,
        customHeaders?: CustomHeaders,
        version?: string
    ): Promise<unknown> {
        const url = await this.sitePath(siteId, suffix, version);
        const config = body === undefined ? { method, url } : { method, url, data: body };
        return this.request.ensureSuccess(await this.request.request<OmadaApiResponse<unknown>>(config, true, customHeaders));
    }

    // ---- Portals ----
    public async getPortal(portalId: string, siteId?: string, h?: CustomHeaders): Promise<unknown> {
        return await this.send('GET', siteId, `/portal/${seg(portalId)}`, undefined, h);
    }
    public async getPortalCustomization(portalId: string, siteId?: string, h?: CustomHeaders): Promise<unknown> {
        return await this.send('GET', siteId, `/portal/${seg(portalId)}/customization`, undefined, h);
    }
    public async getPortalDomain(siteId?: string, h?: CustomHeaders): Promise<unknown> {
        return await this.send('GET', siteId, '/portal/setting/domain', undefined, h);
    }
    public async createPortal(payload: In<typeof schemas.portalSettingSchema>, siteId?: string, h?: CustomHeaders): Promise<unknown> {
        return await this.send('POST', siteId, '/portal', schemas.portalSettingSchema.parse(payload), h);
    }
    public async updatePortal(
        portalId: string,
        payload: In<typeof schemas.portalSettingSchema>,
        siteId?: string,
        h?: CustomHeaders
    ): Promise<unknown> {
        return await this.send('PATCH', siteId, `/portal/${seg(portalId)}`, schemas.portalSettingSchema.parse(payload), h);
    }
    public async deletePortal(portalId: string, siteId?: string, h?: CustomHeaders): Promise<unknown> {
        return await this.send('DELETE', siteId, `/portal/${seg(portalId)}`, undefined, h);
    }

    // ---- PPSK profiles ----
    public async createPpskProfile(payload: In<typeof schemas.ppskProfileV2Schema>, siteId?: string, h?: CustomHeaders): Promise<unknown> {
        return await this.send('POST', siteId, '/ppsk-profile', schemas.ppskProfileV2Schema.parse(payload), h, 'v2');
    }
    public async updatePpskProfile(
        profileId: string,
        payload: In<typeof schemas.ppskProfileSchema>,
        siteId?: string,
        h?: CustomHeaders
    ): Promise<unknown> {
        return await this.send('POST', siteId, `/ppsk-profile/${seg(profileId)}`, schemas.ppskProfileSchema.parse(payload), h, 'v1');
    }
    public async deletePpskProfile(profileId: string, siteId?: string, h?: CustomHeaders): Promise<unknown> {
        return await this.send('DELETE', siteId, `/ppsk-profile/${seg(profileId)}`, undefined, h, 'v1');
    }
    public async addPpskEntries(
        profileId: string,
        payload: In<typeof schemas.addPSKsOpenApiVOSchema>,
        siteId?: string,
        h?: CustomHeaders
    ): Promise<unknown> {
        return await this.send('POST', siteId, `/ppsk-profile/${seg(profileId)}/add-psk`, schemas.addPSKsOpenApiVOSchema.parse(payload), h, 'v1');
    }
    public async deletePpskEntries(profileId: string, names: string[], siteId?: string, h?: CustomHeaders): Promise<unknown> {
        const body = schemas.deletePSKsOpenApiVOSchema.parse({
            ppskNameList: z.array(idSchema).min(1, 'At least one PSK name is required.').parse(names),
        });
        return await this.send('POST', siteId, `/ppsk-profile/${seg(profileId)}/delete-psk`, body, h, 'v1');
    }

    // ---- Reboot schedules (read only; schedules act on devices) ----
    public async listRebootSchedules(siteId?: string, h?: CustomHeaders): Promise<unknown> {
        return await this.send('GET', siteId, '/reboot-schedules', undefined, h, 'v1');
    }
}

function seg(value: string): string {
    return encodeURIComponent(idSchema.parse(value));
}
