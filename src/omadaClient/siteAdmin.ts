import type { AxiosRequestConfig } from 'axios';
import { z } from 'zod';

import type { CustomHeaders, OmadaApiResponse } from '../types/index.js';
import type { RequestHandler } from './request.js';
import * as schemas from './requestSchemas.js';
import type { SiteOperations } from './site.js';

type In<S extends z.ZodTypeAny> = z.input<S>;

const idSchema = z.string().trim().min(1, 'An identifier is required.');
const siteIdsSchema = z.array(idSchema).min(1, 'At least one site ID is required.').max(100);

/**
 * Controller-level site administration: create, update and delete sites, site tags and scenarios,
 * site map positions and overrides, and the per-site jumbo frame, LAG hash and device account settings.
 *
 * Every route is verified against docs/openapi (see tests/omadaClient/siteAdmin.test.ts).
 */
export class SiteAdminOperations {
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

    // ---- Sites ----
    public async createSite(payload: In<typeof schemas.createSiteEntity02Schema>, h?: CustomHeaders): Promise<unknown> {
        return await this.call({ url: this.buildPath('/sites'), method: 'POST', data: schemas.createSiteEntity02Schema.parse(payload) }, h);
    }
    public async updateSite(siteId: string, payload: In<typeof schemas.updateSiteEntity02Schema>, h?: CustomHeaders): Promise<unknown> {
        const data = schemas.updateSiteEntity02Schema.parse(payload);
        return await this.call({ url: this.buildPath(`/sites/${seg(siteId)}`), method: 'PUT', data }, h);
    }
    /** Deletes a site and everything configured in it. The site ID is always explicit, never the default site. */
    public async deleteSite(siteId: string, h?: CustomHeaders): Promise<unknown> {
        return await this.call({ url: this.buildPath(`/sites/${seg(siteId)}`), method: 'DELETE' }, h);
    }

    // ---- Site tags ----
    public async listSiteTags(h?: CustomHeaders): Promise<unknown> {
        return await this.call({ url: this.buildPath('/sites/tags'), method: 'GET' }, h);
    }
    public async createSiteTag(payload: In<typeof schemas.createSiteTagOpenApiVO02Schema>, h?: CustomHeaders): Promise<unknown> {
        const data = schemas.createSiteTagOpenApiVO02Schema.parse(payload);
        return await this.call({ url: this.buildPath('/sites/tags'), method: 'POST', data }, h);
    }
    public async updateSiteTag(tagId: string, name: string, h?: CustomHeaders): Promise<unknown> {
        const data = schemas.siteTag02Schema.parse({ tagId: idSchema.parse(tagId), name });
        return await this.call({ url: this.buildPath('/sites/tags'), method: 'PATCH', data }, h);
    }
    public async deleteSiteTag(tagId: string, h?: CustomHeaders): Promise<unknown> {
        return await this.call({ url: this.buildPath('/sites/tags'), method: 'DELETE', data: { tagId: idSchema.parse(tagId) } }, h);
    }

    // ---- Scenarios ----
    public async listScenarios(h?: CustomHeaders): Promise<unknown> {
        return await this.call({ url: this.buildPath('/scenarios/difference'), method: 'GET' }, h);
    }
    public async createScenario(name: string, h?: CustomHeaders): Promise<unknown> {
        return await this.call({ url: this.buildPath('/scenarios'), method: 'POST', data: schemas.scenario02Schema.parse({ name }) }, h);
    }
    public async deleteScenario(name: string, h?: CustomHeaders): Promise<unknown> {
        return await this.call({ url: this.buildPath('/scenarios'), method: 'DELETE', data: schemas.scenario02Schema.parse({ name }) }, h);
    }

    // ---- Site map and overrides ----
    public async listPlacedSitePositions(h?: CustomHeaders): Promise<unknown> {
        return await this.call({ url: this.buildPath('/placed-site-position'), method: 'GET' }, h);
    }
    public async listUnplacedSitePositions(page: number, pageSize: number, searchKey?: string, h?: CustomHeaders): Promise<unknown> {
        const params = { page, pageSize, ...(searchKey ? { searchKey } : {}) };
        return await this.call({ url: this.buildPath('/unplaced-site-position'), method: 'GET', params }, h);
    }
    public async getSiteOverrides(siteIds: string[], h?: CustomHeaders): Promise<unknown> {
        const params = { siteIds: siteIdsSchema.parse(siteIds).join(',') };
        return await this.call({ url: this.buildPath('/site-overrides'), method: 'GET', params }, h);
    }
    public async getSiteHealthOverview(siteId?: string, h?: CustomHeaders): Promise<unknown> {
        const resolvedSiteId = await this.siteSegment(siteId);
        return await this.call({ url: this.buildPath(`/sites/${resolvedSiteId}/global-dashboard/site-map/abnormal`), method: 'GET' }, h);
    }

    // ---- Per-site switching and device account settings ----
    public async getSiteJumbo(siteId?: string, h?: CustomHeaders): Promise<unknown> {
        const resolvedSiteId = await this.siteSegment(siteId);
        return await this.call({ url: this.buildPath(`/sites/${resolvedSiteId}/jumbo`), method: 'GET' }, h);
    }
    public async setSiteJumbo(payload: In<typeof schemas.siteJumboOpenApiVOSchema>, siteId?: string, h?: CustomHeaders): Promise<unknown> {
        const resolvedSiteId = await this.siteSegment(siteId);
        const data = schemas.siteJumboOpenApiVOSchema.parse(payload);
        return await this.call({ url: this.buildPath(`/sites/${resolvedSiteId}/jumbo`), method: 'PUT', data }, h);
    }
    public async getSiteLagHashAlgorithm(siteId?: string, h?: CustomHeaders): Promise<unknown> {
        const resolvedSiteId = await this.siteSegment(siteId);
        return await this.call({ url: this.buildPath(`/sites/${resolvedSiteId}/lag-hash-alg`), method: 'GET' }, h);
    }
    public async setSiteLagHashAlgorithm(
        payload: In<typeof schemas.siteLagHashAlgOpenApiVOSchema>,
        siteId?: string,
        h?: CustomHeaders
    ): Promise<unknown> {
        const resolvedSiteId = await this.siteSegment(siteId);
        const data = schemas.siteLagHashAlgOpenApiVOSchema.parse(payload);
        return await this.call({ url: this.buildPath(`/sites/${resolvedSiteId}/lag-hash-alg`), method: 'PUT', data }, h);
    }
    public async setSiteDeviceAccount(
        payload: In<typeof schemas.deviceAccountSettingOpenApiVO02Schema>,
        siteId?: string,
        h?: CustomHeaders
    ): Promise<unknown> {
        const resolvedSiteId = await this.siteSegment(siteId);
        const data = schemas.deviceAccountSettingOpenApiVO02Schema.parse(payload);
        return await this.call({ url: this.buildPath(`/sites/${resolvedSiteId}/device-account`), method: 'PUT', data }, h);
    }
}

function seg(value: string): string {
    return encodeURIComponent(idSchema.parse(value));
}
