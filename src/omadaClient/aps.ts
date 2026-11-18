import { z } from 'zod';

import type { CustomHeaders, OmadaApiResponse } from '../types/index.js';
import type { RequestHandler } from './request.js';
import * as schemas from './requestSchemas.js';
import type { SiteOperations } from './site.js';
import type { Input } from './siteConfig.js';

type Method = 'GET' | 'POST' | 'PATCH';

const macPathSchema = z.string().regex(/^[0-9a-f]{2}([:-][0-9a-f]{2}){5}$/i, 'A valid MAC address is required.');

/**
 * Access-point reads and actions not covered by DeviceOperations: AFC, LAN traffic, interference
 * detection status, L3 access, LAG, management WLAN, SSID overrides, VLAN, RF scan and port VLANs.
 *
 * Every route is verified against docs/openapi (see tests/omadaClient/aps.test.ts).
 */
export class ApOperations {
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

    private async list(siteId: string | undefined, suffix: string, customHeaders?: CustomHeaders, version?: string): Promise<unknown[]> {
        return await this.request.fetchPaginated<unknown>(await this.sitePath(siteId, suffix, version), {}, customHeaders);
    }

    public async getApAfcStatus(apMac: string, siteId?: string, h?: CustomHeaders): Promise<unknown> {
        return await this.send('GET', siteId, `/aps/${mac(apMac)}/afc`, undefined, h, 'v1');
    }
    public async getApLanTraffic(apMac: string, siteId?: string, h?: CustomHeaders): Promise<unknown> {
        return await this.send('GET', siteId, `/aps/${mac(apMac)}/lan-traffic-info`, undefined, h, 'v1');
    }
    public async getApInterferenceDetectionStatus(apMac: string, siteId?: string, h?: CustomHeaders): Promise<unknown> {
        return await this.send('GET', siteId, `/aps/${mac(apMac)}/full-channel-detect/status`, undefined, h, 'v1');
    }
    public async getApL3Access(apMac: string, siteId?: string, h?: CustomHeaders): Promise<unknown> {
        return await this.send('GET', siteId, `/aps/${mac(apMac)}/l3access`, undefined, h, 'v1');
    }
    public async getApLagConfig(apMac: string, siteId?: string, h?: CustomHeaders): Promise<unknown> {
        return await this.send('GET', siteId, `/aps/${mac(apMac)}/lag`, undefined, h, 'v1');
    }
    public async getApManagementWlan(apMac: string, siteId?: string, h?: CustomHeaders): Promise<unknown> {
        return await this.send('GET', siteId, `/aps/${mac(apMac)}/management-wlan`, undefined, h, 'v1');
    }
    public async listApPortVlans(apMac: string, siteId?: string, h?: CustomHeaders): Promise<unknown[]> {
        return await this.list(siteId, `/aps/${mac(apMac)}/port-vlans`, h, 'v1');
    }
    public async getApSsidOverrides(apMac: string, siteId?: string, h?: CustomHeaders): Promise<unknown> {
        return await this.send('GET', siteId, `/aps/${mac(apMac)}/override`, undefined, h, 'v2');
    }
    public async setApSsidOverrides(
        apMac: string,
        payload: Input<typeof schemas.apSsidOverrideOpenApiV2VO03Schema>,
        siteId?: string,
        h?: CustomHeaders
    ): Promise<unknown> {
        return await this.send('PATCH', siteId, `/aps/${mac(apMac)}/override`, schemas.apSsidOverrideOpenApiV2VO03Schema.parse(payload), h, 'v2');
    }
    public async getApRfScanResult(apMac: string, siteId?: string, h?: CustomHeaders): Promise<unknown> {
        return await this.send('GET', siteId, `/aps/${mac(apMac)}/rf-scan-result`, undefined, h, 'v2');
    }
    public async startApRfScan(
        apMac: string,
        payload: Input<typeof schemas.rFScanCommand03Schema>,
        siteId?: string,
        h?: CustomHeaders
    ): Promise<unknown> {
        return await this.send('POST', siteId, `/aps/${mac(apMac)}/start-rf-scan`, schemas.rFScanCommand03Schema.parse(payload), h, 'v2');
    }
    public async listLockToApAps(siteId?: string, h?: CustomHeaders): Promise<unknown> {
        return await this.send('GET', siteId, '/lockToAp/aps', undefined, h, 'v2');
    }
}

function mac(value: string): string {
    return encodeURIComponent(macPathSchema.parse(value));
}
