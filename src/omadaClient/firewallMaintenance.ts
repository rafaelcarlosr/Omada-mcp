import { z } from 'zod';

import type { CustomHeaders, OmadaApiResponse } from '../types/index.js';
import type { RequestHandler } from './request.js';
import * as schemas from './requestSchemas.js';
import type { SiteOperations } from './site.js';

type Method = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
type In<S extends z.ZodTypeAny> = z.input<S>;

const idsSchema = z.array(z.string().trim().min(1)).min(1, 'At least one ID is required.').max(1000);
/** Item ID -> 1-based position; controller 6.3 only accepts the complete set of items of the type. */
const indexesSchema = z
    .record(z.string().min(1), z.number().int().min(1))
    .refine((value) => Object.keys(value).length > 0, 'At least one index is required.');
export const aclOrderTypeSchema = z.enum(['gateway', 'switch', 'eap']);
export const urlFilterOrderTypeSchema = z.enum(['gateway', 'ap']);
export const gatewayCustomAclChangesSchema = z
    .object({
        adds: z.array(schemas.gatewayCustomACLAddEntitySchema).optional(),
        modifies: z.array(schemas.gatewayCustomACLModifyEntitySchema).optional(),
        deletes: z.array(z.string().trim().min(1)).optional(),
    })
    .strict();
/** Batch edit switch values: 0 turns on, 1 turns off, 2 keeps the current value (confirmed in the lab). */
const switchCodeSchema = z.union([z.literal(0), z.literal(1), z.literal(2)]);

/**
 * Firewall maintenance that needs no adopted gateway: resets (6.3 answers GET firewall/timeout/default with the
 * current setting, not the defaults, so it is not used), the content filter global
 * setting, rule and ACL ordering, ACL hit counters and gateway custom ACLs.
 *
 * Every route is verified against docs/openapi (see tests/omadaClient/firewallMaintenance.test.ts).
 */
export class FirewallMaintenanceOperations {
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

    // ---- Defaults and resets ----
    public async resetFirewallSetting(siteId?: string, h?: CustomHeaders): Promise<unknown> {
        return await this.send('PATCH', siteId, '/firewall/reset', {}, h);
    }
    public async getAttackDefenseDefaults(siteId?: string, h?: CustomHeaders): Promise<unknown> {
        return await this.send('GET', siteId, '/attack-defense/default', undefined, h);
    }
    public async resetAttackDefenseSetting(siteId?: string, h?: CustomHeaders): Promise<unknown> {
        return await this.send('PATCH', siteId, '/attack-defense/reset', {}, h);
    }

    // ---- Content filtering ----
    public async listUrlFilterCategories(siteId?: string, h?: CustomHeaders): Promise<unknown> {
        return await this.send('GET', siteId, '/url-filters/category', undefined, h);
    }
    public async setUrlFilterGlobalSetting(
        payload: In<typeof schemas.urlFilterGlobalOpenApiVOSchema>,
        siteId?: string,
        h?: CustomHeaders
    ): Promise<unknown> {
        return await this.send('PATCH', siteId, '/url-filters/globalUrlFilter', schemas.urlFilterGlobalOpenApiVOSchema.parse(payload), h);
    }
    public async reorderUrlFilterRules(
        type: z.input<typeof urlFilterOrderTypeSchema>,
        indexes: Record<string, number>,
        siteId?: string,
        h?: CustomHeaders
    ): Promise<unknown> {
        const body = { type: urlFilterOrderTypeSchema.parse(type), indexes: indexesSchema.parse(indexes) };
        return await this.send('PATCH', siteId, '/url-filters', body, h);
    }

    // ---- ACL ordering and hit counters ----
    public async reorderAcls(
        type: z.input<typeof aclOrderTypeSchema>,
        indexes: Record<string, number>,
        siteId?: string,
        h?: CustomHeaders
    ): Promise<unknown> {
        const body = { type: aclOrderTypeSchema.parse(type), indexes: indexesSchema.parse(indexes) };
        return await this.send('POST', siteId, '/acls/modifyIndex', body, h);
    }
    public async clearGatewayAclHitCounts(siteId?: string, h?: CustomHeaders): Promise<unknown> {
        return await this.send('POST', siteId, '/acls/osg-acls/hit-counts', {}, h);
    }

    // ---- Gateway custom ACLs ----
    public async updateGatewayCustomAcls(
        changes: z.input<typeof gatewayCustomAclChangesSchema>,
        siteId?: string,
        h?: CustomHeaders
    ): Promise<unknown> {
        const body = gatewayCustomAclChangesSchema.parse(changes);
        if (!body.adds?.length && !body.modifies?.length && !body.deletes?.length) throw new Error('At least one custom ACL change is required.');
        return await this.send('PATCH', siteId, '/acls/osg-custom-acls', body, h);
    }
    public async reorderGatewayCustomAcls(indexes: Record<string, number>, siteId?: string, h?: CustomHeaders): Promise<unknown> {
        return await this.send('POST', siteId, '/acls/osg-custom-acls/modifyIndex', { type: 'gateway', indexes: indexesSchema.parse(indexes) }, h);
    }
    public async clearGatewayCustomAclHitCounts(siteId?: string, h?: CustomHeaders): Promise<unknown> {
        return await this.send('POST', siteId, '/acls/osg-custom-acls/hit-counts', {}, h);
    }
    /** status and log: 0 turns on, 1 turns off, 2 keeps. Only the listed IDs change. */
    public async setGatewayCustomAclsState(ids: string[], status: 0 | 1 | 2, log: 0 | 1 | 2, siteId?: string, h?: CustomHeaders): Promise<unknown> {
        const body = { ids: idsSchema.parse(ids), selectType: 'include', status: switchCodeSchema.parse(status), log: switchCodeSchema.parse(log) };
        return await this.send('POST', siteId, '/acls/gateway-acls/batch-edit', body, h);
    }
    /** Only the listed IDs are deleted, never "all". */
    public async deleteGatewayCustomAcls(ids: string[], siteId?: string, h?: CustomHeaders): Promise<unknown> {
        return await this.send('POST', siteId, '/acls/gateway-acls/batch-delete', { ids: idsSchema.parse(ids), selectType: 'include' }, h);
    }
}
