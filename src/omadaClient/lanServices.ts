import { z } from 'zod';

import type { CustomHeaders, OmadaApiResponse } from '../types/index.js';
import type { RequestHandler } from './request.js';
import * as schemas from './requestSchemas.js';
import type { SiteOperations } from './site.js';

type Method = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
type In<S extends z.ZodTypeAny> = z.input<S>;

const idSchema = z.string().trim().min(1, 'An identifier is required.');

/** LAN multicast snooping without the read-only id and resource fields. */
export const lanMulticastPayloadSchema = schemas.lanMulticastVOSchema.omit({ id: true, resource: true });

/**
 * LAN services that need no adopted gateway: network reads, DHCP client and reservation reads, DNS cache and
 * proxy, the IP-MAC binding general setting, multicast snooping and AP OUI-based VLAN rules.
 *
 * Every route is verified against docs/openapi (see tests/omadaClient/lanServices.test.ts).
 */
export class LanServiceOperations {
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

    // ---- Networks and DHCP ----
    public async getLanNetwork(networkId: string, siteId?: string, h?: CustomHeaders): Promise<unknown> {
        return await this.send('GET', siteId, `/lan-networks/${seg(networkId)}`, undefined, h);
    }
    public async listAllLanNetworks(siteId?: string, h?: CustomHeaders): Promise<unknown> {
        return await this.send('GET', siteId, '/lan-networks/all', undefined, h);
    }
    public async listDhcpClients(siteId?: string, h?: CustomHeaders): Promise<unknown[]> {
        return await this.list(siteId, '/setting/service/dhcp/user-list', h);
    }
    public async listDhcpReservationTargets(siteId?: string, h?: CustomHeaders): Promise<unknown> {
        return await this.send('GET', siteId, '/networks/server-for-reservation', undefined, h);
    }

    // ---- DNS and IP-MAC binding ----
    public async setDnsCacheSetting(payload: In<typeof schemas.dnsCacheOpenApiVOSchema>, siteId?: string, h?: CustomHeaders): Promise<unknown> {
        return await this.send('PUT', siteId, '/setting/service/dns-cache', schemas.dnsCacheOpenApiVOSchema.parse(payload), h);
    }
    public async clearDnsCache(siteId?: string, h?: CustomHeaders): Promise<unknown> {
        return await this.send('POST', siteId, '/setting/dns-cache-data/clear', {}, h);
    }
    public async setDnsProxy(payload: In<typeof schemas.dnsProxySettingOpenApiVOSchema>, siteId?: string, h?: CustomHeaders): Promise<unknown> {
        return await this.send('PATCH', siteId, '/setting/service/dns-proxy', schemas.dnsProxySettingOpenApiVOSchema.parse(payload), h);
    }
    public async setIpMacBindingGeneralSetting(
        payload: In<typeof schemas.iPMacBindingGeneralSettingSchema>,
        siteId?: string,
        h?: CustomHeaders
    ): Promise<unknown> {
        return await this.send('PATCH', siteId, '/ip-mac-bind', schemas.iPMacBindingGeneralSettingSchema.parse(payload), h);
    }

    // ---- Multicast snooping ----
    public async listLanMulticasts(siteId?: string, h?: CustomHeaders): Promise<unknown[]> {
        return await this.list(siteId, '/lan-multicasts', h);
    }
    public async createLanMulticast(payload: In<typeof lanMulticastPayloadSchema>, siteId?: string, h?: CustomHeaders): Promise<unknown> {
        return await this.send('POST', siteId, '/lan-multicasts', lanMulticastPayloadSchema.parse(payload), h);
    }
    public async updateLanMulticast(
        multicastId: string,
        payload: In<typeof lanMulticastPayloadSchema>,
        siteId?: string,
        h?: CustomHeaders
    ): Promise<unknown> {
        return await this.send('PATCH', siteId, `/lan-multicasts/${seg(multicastId)}`, lanMulticastPayloadSchema.parse(payload), h);
    }
    public async deleteLanMulticast(multicastId: string, siteId?: string, h?: CustomHeaders): Promise<unknown> {
        return await this.send('DELETE', siteId, `/lan-multicasts/${seg(multicastId)}`, undefined, h);
    }

    // ---- AP OUI-based VLAN rules ----
    public async listApOuiRules(siteId?: string, h?: CustomHeaders): Promise<unknown[]> {
        return await this.list(siteId, '/ap-oui-rules', h);
    }
    public async createApOuiRule(payload: In<typeof schemas.ouiBasedVlanApOpenApiVOSchema>, siteId?: string, h?: CustomHeaders): Promise<unknown> {
        return await this.send('POST', siteId, '/ap-oui-rules', schemas.ouiBasedVlanApOpenApiVOSchema.parse(payload), h);
    }
    public async updateApOuiRule(
        ruleId: string,
        payload: In<typeof schemas.ouiBasedVlanApOpenApiVOSchema>,
        siteId?: string,
        h?: CustomHeaders
    ): Promise<unknown> {
        return await this.send('PUT', siteId, `/ap-oui-rules/${seg(ruleId)}`, schemas.ouiBasedVlanApOpenApiVOSchema.parse(payload), h);
    }
    public async deleteApOuiRule(ruleId: string, siteId?: string, h?: CustomHeaders): Promise<unknown> {
        return await this.send('DELETE', siteId, `/ap-oui-rules/${seg(ruleId)}`, undefined, h);
    }
}

function seg(value: string): string {
    return encodeURIComponent(idSchema.parse(value));
}
