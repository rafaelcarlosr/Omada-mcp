import type { AxiosRequestConfig } from 'axios';
import { z } from 'zod';

import type { CustomHeaders, OmadaApiResponse } from '../types/index.js';
import type { RequestHandler } from './request.js';
import * as schemas from './requestSchemas.js';

type In<S extends z.ZodTypeAny> = z.input<S>;

const idSchema = z.string().trim().min(1, 'An identifier is required.');
const siteIdsSchema = z.array(idSchema).min(1, 'At least one site ID is required.').max(300);

/** Template creation without the deprecated type field. */
export const siteTemplateCreateSchema = schemas.createSiteTemplateEntity02Schema.omit({ type: true });

/**
 * Site template management: create, rename, copy and delete templates, create sites from a template, and bind,
 * unbind and sync sites. Template settings themselves mirror the site routes and are not covered here.
 *
 * Every route is verified against docs/openapi (see tests/omadaClient/siteTemplates.test.ts).
 */
export class SiteTemplateOperations {
    constructor(
        private readonly request: RequestHandler,
        private readonly buildPath: (path: string) => string
    ) {}

    private async call(config: AxiosRequestConfig, customHeaders?: CustomHeaders): Promise<unknown> {
        return this.request.ensureSuccess(await this.request.request<OmadaApiResponse<unknown>>(config, true, customHeaders));
    }

    // ---- Reads ----
    public async listSiteTemplateModules(h?: CustomHeaders): Promise<unknown> {
        return await this.call({ url: this.buildPath('/sitetemplates/modules'), method: 'GET' }, h);
    }
    public async listSiteTemplateAllModules(h?: CustomHeaders): Promise<unknown> {
        return await this.call({ url: this.buildPath('/sitetemplates/all-modules'), method: 'GET' }, h);
    }
    public async getSiteTemplateSpecification(siteTemplateId: string, h?: CustomHeaders): Promise<unknown> {
        return await this.call({ url: this.buildPath(`/sitetemplates/${seg(siteTemplateId)}/specification`), method: 'GET' }, h);
    }
    public async getSiteTemplateCapacity(siteTemplateId: string, h?: CustomHeaders): Promise<unknown> {
        return await this.call({ url: this.buildPath(`/sitetemplates/${seg(siteTemplateId)}/capacity`), method: 'GET' }, h);
    }
    public async listSiteTemplateBoundSites(siteTemplateId: string, page: number, pageSize: number, h?: CustomHeaders): Promise<unknown> {
        return await this.call(
            { url: this.buildPath(`/sitetemplates/${seg(siteTemplateId)}/binding-sites`), method: 'GET', params: { page, pageSize } },
            h
        );
    }
    public async listSitesAvailableForTemplate(
        siteTemplateId: string,
        page: number,
        pageSize: number,
        searchKey?: string,
        h?: CustomHeaders
    ): Promise<unknown> {
        const params = { page, pageSize, ...(searchKey ? { searchKey } : {}) };
        return await this.call({ url: this.buildPath(`/sitetemplates/${seg(siteTemplateId)}/available-bind`), method: 'GET', params }, h);
    }

    // ---- Templates ----
    public async createSiteTemplate(payload: In<typeof siteTemplateCreateSchema>, h?: CustomHeaders): Promise<unknown> {
        return await this.call({ url: this.buildPath('/sitetemplates'), method: 'POST', data: siteTemplateCreateSchema.parse(payload) }, h);
    }
    public async renameSiteTemplate(siteTemplateId: string, name: string, h?: CustomHeaders): Promise<unknown> {
        const data = schemas.updateSiteByTemplate02Schema.parse({ name });
        return await this.call({ url: this.buildPath(`/sitetemplates/${seg(siteTemplateId)}`), method: 'PUT', data }, h);
    }
    public async deleteSiteTemplate(siteTemplateId: string, h?: CustomHeaders): Promise<unknown> {
        return await this.call({ url: this.buildPath(`/sitetemplates/${seg(siteTemplateId)}`), method: 'DELETE' }, h);
    }
    public async copySiteTemplate(siteTemplateId: string, name: string, h?: CustomHeaders): Promise<unknown> {
        const data = schemas.copySiteTemplateOpenApiVO02Schema.parse({ name });
        return await this.call({ url: this.buildPath(`/sitetemplates/${seg(siteTemplateId)}/copy`), method: 'POST', data }, h);
    }

    // ---- Sites and templates ----
    public async createSiteFromTemplate(payload: In<typeof schemas.createSiteByTemplate02Schema>, h?: CustomHeaders): Promise<unknown> {
        const data = schemas.createSiteByTemplate02Schema.parse(payload);
        return await this.call({ url: this.buildPath('/sites/template'), method: 'POST', data }, h);
    }
    public async bindSiteToTemplate(
        siteTemplateId: string,
        payload: In<typeof schemas.bindSiteOpenApiVO02Schema>,
        h?: CustomHeaders
    ): Promise<unknown> {
        const data = schemas.bindSiteOpenApiVO02Schema.parse(payload);
        return await this.call({ url: this.buildPath(`/sitetemplates/${seg(siteTemplateId)}/bind-site`), method: 'POST', data }, h);
    }
    public async unbindSitesFromTemplate(siteTemplateId: string, siteIds: string[], h?: CustomHeaders): Promise<unknown> {
        const data = { siteIds: siteIdsSchema.parse(siteIds) };
        return await this.call({ url: this.buildPath(`/sitetemplates/${seg(siteTemplateId)}/batch-unbind`), method: 'POST', data }, h);
    }
    public async syncSitesWithTemplate(siteTemplateId: string, siteIds: string[], h?: CustomHeaders): Promise<unknown> {
        const data = schemas.batchSyncSitesOpenApiVO02Schema.parse({ siteIds: siteIdsSchema.parse(siteIds) });
        return await this.call({ url: this.buildPath(`/sitetemplates/${seg(siteTemplateId)}/multi-sites/sync`), method: 'POST', data }, h);
    }
}

function seg(value: string): string {
    return encodeURIComponent(idSchema.parse(value));
}
