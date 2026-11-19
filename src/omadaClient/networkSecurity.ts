import { z } from 'zod';

import type { CustomHeaders, OmadaApiResponse } from '../types/index.js';
import type { RequestHandler } from './request.js';
import * as schemas from './requestSchemas.js';
import type { SiteOperations } from './site.js';

type Method = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
type In<S extends z.ZodTypeAny> = z.input<S>;

const idSchema = z.string().trim().min(1, 'An identifier is required.');

/**
 * Site network security: wireless IDS/IPS, the gateway IPS allow list, block list entries and signature
 * suppressions. Reads of the IPS lists live in network.ts (getGridAllowList, getGridBlockList, getIpsSignatureList).
 *
 * Every route is verified against docs/openapi (see tests/omadaClient/networkSecurity.test.ts).
 */
export class NetworkSecurityOperations {
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

    // ---- Wireless IDS / IPS ----
    public async getWirelessIdsConfig(siteId?: string, h?: CustomHeaders): Promise<unknown> {
        return await this.send('GET', siteId, '/network-security/wireless-ids', undefined, h);
    }
    public async setWirelessIdsConfig(
        payload: In<typeof schemas.updateWidsConfigOpenApiVOSchema>,
        siteId?: string,
        h?: CustomHeaders
    ): Promise<unknown> {
        return await this.send('PUT', siteId, '/network-security/wireless-ids', schemas.updateWidsConfigOpenApiVOSchema.parse(payload), h);
    }
    public async getWirelessIpsConfig(siteId?: string, h?: CustomHeaders): Promise<unknown> {
        return await this.send('GET', siteId, '/network-security/wireless-ips', undefined, h);
    }
    public async setWirelessIpsConfig(
        payload: In<typeof schemas.updateWipsConfigOpenApiVOSchema>,
        siteId?: string,
        h?: CustomHeaders
    ): Promise<unknown> {
        return await this.send('PUT', siteId, '/network-security/wireless-ips', schemas.updateWipsConfigOpenApiVOSchema.parse(payload), h);
    }

    // ---- IPS allow list, block list and signatures ----
    public async createIpsAllowEntry(payload: In<typeof schemas.newIPSAllowListEntrySchema>, siteId?: string, h?: CustomHeaders): Promise<unknown> {
        return await this.send('POST', siteId, '/network-security/ips/allow-list', schemas.newIPSAllowListEntrySchema.parse(payload), h);
    }
    public async updateIpsAllowEntry(
        payload: In<typeof schemas.modifyIPSAllowListEntrySchema>,
        siteId?: string,
        h?: CustomHeaders
    ): Promise<unknown> {
        return await this.send('PATCH', siteId, '/network-security/ips/allow-list', schemas.modifyIPSAllowListEntrySchema.parse(payload), h);
    }
    public async deleteIpsAllowEntry(entryId: string, siteId?: string, h?: CustomHeaders): Promise<unknown> {
        return await this.send('DELETE', siteId, `/network-security/ips/allow-list/${seg(entryId)}`, undefined, h);
    }
    public async deleteIpsBlockEntry(entryId: string, siteId?: string, h?: CustomHeaders): Promise<unknown> {
        return await this.send('DELETE', siteId, `/network-security/ips/block-list/${seg(entryId)}`, undefined, h);
    }
    public async updateIpsSignature(
        signId: string,
        payload: In<typeof schemas.ipsSignatureConfigSchema>,
        siteId?: string,
        h?: CustomHeaders
    ): Promise<unknown> {
        return await this.send('PATCH', siteId, `/network-security/ips/signature/${seg(signId)}`, schemas.ipsSignatureConfigSchema.parse(payload), h);
    }
    public async deleteIpsSignature(signId: string, siteId?: string, h?: CustomHeaders): Promise<unknown> {
        return await this.send('DELETE', siteId, `/network-security/ips/signature/${seg(signId)}`, undefined, h);
    }
}

function seg(value: string): string {
    return encodeURIComponent(idSchema.parse(value));
}
