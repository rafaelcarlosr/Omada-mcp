import { z } from 'zod';

import type { CustomHeaders, OmadaApiResponse } from '../types/index.js';
import type { RequestHandler } from './request.js';
import * as schemas from './requestSchemas.js';
import type { SiteOperations } from './site.js';

type Method = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
type In<S extends z.ZodTypeAny> = z.input<S>;

const idSchema = z.string().trim().min(1, 'An identifier is required.');

/**
 * Site RADIUS profiles, LDAP profiles and built-in RADIUS server users. Controller 6.3 requires the complete
 * body on PATCH, so updates take the full official create schema.
 *
 * Every route is verified against docs/openapi (see tests/omadaClient/authProfiles.test.ts).
 */
export class AuthProfileOperations {
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

    // ---- RADIUS profiles ----
    public async createRadiusProfile(
        payload: In<typeof schemas.createRadiusProfileOpenApiVOSchema>,
        siteId?: string,
        h?: CustomHeaders
    ): Promise<unknown> {
        return await this.send('POST', siteId, '/profiles/radius', schemas.createRadiusProfileOpenApiVOSchema.parse(payload), h);
    }
    public async updateRadiusProfile(
        radiusProfileId: string,
        payload: In<typeof schemas.createRadiusProfileOpenApiVOSchema>,
        siteId?: string,
        h?: CustomHeaders
    ): Promise<unknown> {
        return await this.send(
            'PATCH',
            siteId,
            `/profiles/radius/${seg(radiusProfileId)}`,
            schemas.createRadiusProfileOpenApiVOSchema.parse(payload),
            h
        );
    }
    public async deleteRadiusProfile(radiusProfileId: string, siteId?: string, h?: CustomHeaders): Promise<unknown> {
        return await this.send('DELETE', siteId, `/profiles/radius/${seg(radiusProfileId)}`, undefined, h);
    }

    // ---- LDAP profiles ----
    public async createLdapProfile(
        payload: In<typeof schemas.createLdapProfileOpenApiVOSchema>,
        siteId?: string,
        h?: CustomHeaders
    ): Promise<unknown> {
        return await this.send('POST', siteId, '/profiles/ldap', schemas.createLdapProfileOpenApiVOSchema.parse(payload), h);
    }
    public async updateLdapProfile(
        ldapProfileId: string,
        payload: In<typeof schemas.createLdapProfileOpenApiVOSchema>,
        siteId?: string,
        h?: CustomHeaders
    ): Promise<unknown> {
        return await this.send('PATCH', siteId, `/profiles/ldap/${seg(ldapProfileId)}`, schemas.createLdapProfileOpenApiVOSchema.parse(payload), h);
    }
    public async deleteLdapProfile(ldapProfileId: string, siteId?: string, h?: CustomHeaders): Promise<unknown> {
        return await this.send('DELETE', siteId, `/profiles/ldap/${seg(ldapProfileId)}`, undefined, h);
    }

    // ---- Built-in RADIUS server users ----
    public async createRadiusUser(payload: In<typeof schemas.createRadiusUserOpenApiVOSchema>, siteId?: string, h?: CustomHeaders): Promise<unknown> {
        return await this.send('POST', siteId, '/profiles/radius-server/users', schemas.createRadiusUserOpenApiVOSchema.parse(payload), h);
    }
    public async updateRadiusUser(
        userId: string,
        payload: In<typeof schemas.createRadiusUserOpenApiVOSchema>,
        siteId?: string,
        h?: CustomHeaders
    ): Promise<unknown> {
        return await this.send(
            'PATCH',
            siteId,
            `/profiles/radius-server/users/${seg(userId)}`,
            schemas.createRadiusUserOpenApiVOSchema.parse(payload),
            h
        );
    }
    public async deleteRadiusUser(userId: string, siteId?: string, h?: CustomHeaders): Promise<unknown> {
        return await this.send('DELETE', siteId, `/profiles/radius-server/users/${seg(userId)}`, undefined, h);
    }
}

function seg(value: string): string {
    return encodeURIComponent(idSchema.parse(value));
}
