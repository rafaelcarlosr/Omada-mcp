import { z } from 'zod';

import type { CustomHeaders, OmadaApiResponse } from '../types/index.js';
import type { RequestHandler } from './request.js';
import * as schemas from './requestSchemas.js';
import type { SiteOperations } from './site.js';
import type { Input } from './siteConfig.js';

type Method = 'GET' | 'POST' | 'PATCH' | 'DELETE';

const macPathSchema = z.string().regex(/^[0-9a-f]{2}([:-][0-9a-f]{2}){5}$/i, 'A valid MAC address is required.');
const idSchema = z.string().trim().min(1, 'An identifier is required.');
/** Switch health routes take epoch milliseconds; seconds make the controller fail or return 1970 buckets. */
export const healthRangeSchema = z
    .object({ start: z.number().int().nonnegative(), end: z.number().int().nonnegative() })
    .strict()
    .refine((range) => range.start < range.end, 'start must be before end.');
/** Switch general config without the SDM template, which needs a reboot and is not offered by these tools. */
export const switchGeneralSettingsSchema = schemas.switchGeneralConfig03Schema.omit({ sdm: true });

/**
 * Switch-level reads and low-risk writes (port labels, general config, cable test, counters).
 *
 * Every route is verified against docs/openapi (see tests/omadaClient/switches.test.ts).
 */
export class SwitchOperations {
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

    // ---- Site-wide port views ----
    public async listSwitchPortPoeInfo(siteId?: string, h?: CustomHeaders): Promise<unknown[]> {
        return await this.list(siteId, '/switches/ports/poe-info', h);
    }
    public async listSwitchPortOverview(siteId?: string, h?: CustomHeaders): Promise<unknown[]> {
        return await this.list(siteId, '/switches/ports/overview', h);
    }
    public async listSwitchPortCounters(siteId?: string, h?: CustomHeaders): Promise<unknown[]> {
        return await this.list(siteId, '/switches/ports/counters', h);
    }
    public async getSwitchPortView(siteId?: string, h?: CustomHeaders): Promise<unknown> {
        return await this.send('GET', siteId, '/switches/ports/switch-detail', undefined, h);
    }

    // ---- Per-switch reads ----
    public async listSwitchLldpNeighbors(switchMac: string, siteId?: string, h?: CustomHeaders): Promise<unknown[]> {
        return await this.list(siteId, `/switches/${mac(switchMac)}/lldp-neighbors`, h);
    }
    public async listSwitchInterfaces(switchMac: string, siteId?: string, h?: CustomHeaders): Promise<unknown[]> {
        return await this.list(siteId, `/switches/${mac(switchMac)}/interfaces`, h);
    }
    public async getSwitchInterfacesBrief(switchMac: string, siteId?: string, h?: CustomHeaders): Promise<unknown> {
        return await this.send('GET', siteId, `/switches/${mac(switchMac)}/interfaces/brief`, undefined, h);
    }
    public async listSwitchPortLagNetworks(switchMac: string, siteId?: string, h?: CustomHeaders): Promise<unknown[]> {
        return await this.list(siteId, `/switches/${mac(switchMac)}/port-lag-networks`, h);
    }
    public async listSwitchNetworksDetail(switchMac: string, siteId?: string, h?: CustomHeaders): Promise<unknown[]> {
        return await this.list(siteId, `/switches/${mac(switchMac)}/networks-detail`, h);
    }
    public async getSwitchExistingNetworks(switchMac: string, siteId?: string, h?: CustomHeaders): Promise<unknown> {
        return await this.send('GET', siteId, `/switches/${mac(switchMac)}/exist-network`, undefined, h);
    }
    public async listSwitchDhcpUsers(switchMac: string, siteId?: string, h?: CustomHeaders): Promise<unknown[]> {
        return await this.list(siteId, `/switches/${mac(switchMac)}/dhcp/user-list`, h);
    }
    public async getSwitchDdmInfo(switchMac: string, siteId?: string, h?: CustomHeaders): Promise<unknown> {
        return await this.send('GET', siteId, `/switches/${mac(switchMac)}/ddm/info`, undefined, h);
    }
    public async getSwitchHealthDetail(
        switchMac: string,
        range: z.input<typeof healthRangeSchema>,
        siteId?: string,
        h?: CustomHeaders
    ): Promise<unknown> {
        const { start, end } = healthRangeSchema.parse(range);
        return await this.send('GET', siteId, `/switches/${mac(switchMac)}/health/detail?start=${start}&end=${end}`, undefined, h);
    }
    public async getSwitchHealthTimeline(
        switchMac: string,
        range: z.input<typeof healthRangeSchema>,
        siteId?: string,
        h?: CustomHeaders
    ): Promise<unknown> {
        const { start, end } = healthRangeSchema.parse(range);
        return await this.send('GET', siteId, `/switches/${mac(switchMac)}/health/timeline?start=${start}&end=${end}`, undefined, h);
    }

    // ---- Port labels ----
    public async listSwitchPortTags(siteId?: string, h?: CustomHeaders): Promise<unknown> {
        return await this.send('GET', siteId, '/switches/port-tag', undefined, h);
    }
    public async createSwitchPortTag(
        payload: Input<typeof schemas.createPortTagOpenApiVO03Schema>,
        siteId?: string,
        h?: CustomHeaders
    ): Promise<unknown> {
        return await this.send('POST', siteId, '/switches/port-tag', schemas.createPortTagOpenApiVO03Schema.parse(payload), h);
    }
    public async updateSwitchPortTag(payload: Input<typeof schemas.portTagOpenApiVO03Schema>, siteId?: string, h?: CustomHeaders): Promise<unknown> {
        return await this.send('PATCH', siteId, '/switches/port-tag', schemas.portTagOpenApiVO03Schema.parse(payload), h);
    }
    public async deleteSwitchPortTag(tagId: string, siteId?: string, h?: CustomHeaders): Promise<unknown> {
        return await this.send('DELETE', siteId, '/switches/port-tag', { tagId: idSchema.parse(tagId) }, h);
    }

    // ---- General config ----
    public async setSwitchGeneralConfig(
        switchMac: string,
        payload: Input<typeof switchGeneralSettingsSchema>,
        siteId?: string,
        h?: CustomHeaders
    ): Promise<unknown> {
        return await this.send('PATCH', siteId, `/switches/${mac(switchMac)}/general-config`, switchGeneralSettingsSchema.parse(payload), h);
    }

    // ---- Cable test and counters ----
    public async startSwitchCableTest(switchMac: string, ports: number[], siteId?: string, h?: CustomHeaders): Promise<unknown> {
        const portList = z
            .array(z.number().int().min(1))
            .min(1)
            .max(64)
            .parse(ports)
            .map((port) => ({ port }));
        const body = schemas.oswCableTestTestingPortOpenApiVO03Schema.parse({ portList });
        return await this.send('POST', siteId, `/cable-test/switches/${mac(switchMac)}/start`, body, h);
    }
    public async cancelSwitchCableTest(switchMac: string, siteId?: string, h?: CustomHeaders): Promise<unknown> {
        return await this.send('POST', siteId, `/cable-test/switches/${mac(switchMac)}/cancel`, undefined, h);
    }
    public async clearSwitchPortCounters(
        payload: Input<typeof schemas.clearCountersVO03Schema>,
        siteId?: string,
        h?: CustomHeaders
    ): Promise<unknown> {
        return await this.send('POST', siteId, '/switches/multi-ports/clear-counters', schemas.clearCountersVO03Schema.parse(payload), h);
    }
}

function mac(value: string): string {
    return encodeURIComponent(macPathSchema.parse(value));
}
