import type { AxiosRequestConfig } from 'axios';
import { z } from 'zod';

import type { CustomHeaders, OmadaApiResponse } from '../types/index.js';
import type { RequestHandler } from './request.js';
import * as schemas from './requestSchemas.js';

type In<S extends z.ZodTypeAny> = z.input<S>;

const countrySchema = z
    .string()
    .trim()
    .regex(/^[A-Z]{2}$/, 'country must be an ISO 3166-1 alpha-2 code such as "KP".');
const siteIdsSchema = z.array(z.string().trim().min(1)).min(1, 'At least one site ID is required.').max(300);

/**
 * Controller-wide threat management: the threat map reads and per-site blocked countries.
 *
 * Every route is verified against docs/openapi (see tests/omadaClient/globalSecurity.test.ts).
 */
export class GlobalSecurityOperations {
    constructor(
        private readonly request: RequestHandler,
        private readonly buildPath: (path: string) => string
    ) {}

    private async call(config: AxiosRequestConfig, customHeaders?: CustomHeaders): Promise<unknown> {
        return this.request.ensureSuccess(await this.request.request<OmadaApiResponse<unknown>>(config, true, customHeaders));
    }

    public async getThreatMap(query: In<typeof schemas.queryThreatMapOpenApiVO22Schema>, h?: CustomHeaders): Promise<unknown> {
        const data = schemas.queryThreatMapOpenApiVO22Schema.parse(query);
        return await this.call({ url: this.buildPath('/security/threat-map'), method: 'POST', data }, h);
    }
    public async getThreatCategoryCounts(query: In<typeof schemas.queryThreatMapOpenApiVO22Schema>, h?: CustomHeaders): Promise<unknown> {
        const data = schemas.queryThreatMapOpenApiVO22Schema.parse(query);
        return await this.call({ url: this.buildPath('/security/threat-map/threat-count'), method: 'POST', data }, h);
    }
    public async listCountryThreats(query: In<typeof schemas.queryCountryThreatListOpenApiVO22Schema>, h?: CustomHeaders): Promise<unknown> {
        const data = schemas.queryCountryThreatListOpenApiVO22Schema.parse(query);
        return await this.call({ url: this.buildPath('/security/threat-map/threats'), method: 'POST', data }, h);
    }
    /** Blocked country codes, for the given sites or all sites. */
    public async listBlockedCountries(siteIds?: string[], h?: CustomHeaders): Promise<unknown> {
        const data = siteIds?.length ? { sites: siteIdsSchema.parse(siteIds).join(',') } : {};
        return await this.call({ url: this.buildPath('/security/blocked-country'), method: 'POST', data }, h);
    }
    public async blockCountry(country: string, siteIds: string[], h?: CustomHeaders): Promise<unknown> {
        const data = schemas.opsBlockedCountryOpenApiVO22Schema.parse({ country: countrySchema.parse(country), sites: siteIdsSchema.parse(siteIds) });
        return await this.call({ url: this.buildPath('/security/blocked-country/add'), method: 'POST', data }, h);
    }
    public async unblockCountry(country: string, siteIds: string[], h?: CustomHeaders): Promise<unknown> {
        const data = schemas.opsBlockedCountryOpenApiVO22Schema.parse({ country: countrySchema.parse(country), sites: siteIdsSchema.parse(siteIds) });
        return await this.call({ url: this.buildPath('/security/blocked-country'), method: 'DELETE', data }, h);
    }
}
