import type { AxiosRequestConfig } from 'axios';
import { z } from 'zod';

import type { CustomHeaders, OmadaApiResponse } from '../types/index.js';
import type { RequestHandler } from './request.js';
import type { SiteOperations } from './site.js';

const idSchema = z.string().trim().min(1, 'An identifier is required.');
const macSchema = z.string().regex(/^[0-9A-Fa-f]{2}([:-][0-9A-Fa-f]{2}){5}$/, 'A valid MAC address is required.');
export const captureDeviceTypeSchema = z.enum(['ap', 'switch', 'gateway']);
export const topologyRootNodeSchema = z
    .object({
        type: z.enum(['switch', 'olt', 'other']).describe('Root node type.'),
        mac: macSchema.optional().describe('Root node MAC.'),
        specificType: z.number().int().min(0).max(1).optional().describe('Multi-switch root: 0 M-LAG, 1 VRRP.'),
        macList: z.array(macSchema).optional().describe('Multi-switch root MACs.'),
        discoveryMode: z.number().int().min(0).max(1).optional().describe('0 manual, 1 automatic discovery.'),
    })
    .strict();
/** Report tab as read from report/allTabs; reordering sends the complete objects back with new ranks. */
export type ReportTabRecord = Record<string, unknown> & { tabId: string; rank: number };

/**
 * Site topology (v2/v3), packet capture lookups, the report email schedule and report tab order.
 *
 * Every route is verified against docs/openapi (see tests/omadaClient/topology.test.ts). Topology and capture
 * are only in the combined 00-all.json spec, not in a tag group file.
 */
export class TopologyOperations {
    constructor(
        private readonly request: RequestHandler,
        private readonly site: SiteOperations,
        private readonly buildPath: (path: string, version?: string) => string
    ) {}

    private async call(config: AxiosRequestConfig, customHeaders?: CustomHeaders): Promise<unknown> {
        return this.request.ensureSuccess(await this.request.request<OmadaApiResponse<unknown>>(config, true, customHeaders));
    }

    // ---- Topology ----
    public async getSiteTopology(siteId?: string, h?: CustomHeaders): Promise<unknown> {
        const resolvedSiteId = await this.site.resolveSiteId(siteId);
        return await this.call({ url: this.buildPath(`/sites/${resolvedSiteId}/topology`, 'v2'), method: 'GET' }, h);
    }
    /** deviceStatus: '0' connected, '1' disconnected, '0,1' both. */
    public async getSiteTopologyByStatus(deviceStatus: '0' | '1' | '0,1', siteId?: string, h?: CustomHeaders): Promise<unknown> {
        const resolvedSiteId = await this.site.resolveSiteId(siteId);
        const params = { 'filters.deviceStatus': z.enum(['0', '1', '0,1']).parse(deviceStatus) };
        return await this.call({ url: this.buildPath(`/sites/${resolvedSiteId}/topology`, 'v3'), method: 'GET', params }, h);
    }
    public async refreshTopology(siteId?: string, h?: CustomHeaders): Promise<unknown> {
        const resolvedSiteId = await this.site.resolveSiteId(siteId);
        return await this.call({ url: this.buildPath(`/sites/${resolvedSiteId}/topology`, 'v2'), method: 'POST' }, h);
    }
    public async listTopologyNodes(siteId?: string, h?: CustomHeaders): Promise<unknown> {
        const resolvedSiteId = await this.site.resolveSiteId(siteId);
        return await this.call({ url: this.buildPath(`/sites/${resolvedSiteId}/topology/nodes`, 'v2'), method: 'GET' }, h);
    }
    public async setTopologyRootNode(payload: z.input<typeof topologyRootNodeSchema>, siteId?: string, h?: CustomHeaders): Promise<unknown> {
        const resolvedSiteId = await this.site.resolveSiteId(siteId);
        const data = topologyRootNodeSchema.parse(payload);
        return await this.call({ url: this.buildPath(`/sites/${resolvedSiteId}/topology/nodes`, 'v2'), method: 'POST', data }, h);
    }
    public async getMultiSiteTopology(siteIds: string[], h?: CustomHeaders): Promise<unknown> {
        const data = { siteIds: z.array(idSchema).min(1, 'At least one site ID is required.').max(100).parse(siteIds) };
        return await this.call({ url: this.buildPath('/topology/batch', 'v2'), method: 'POST', data }, h);
    }
    /** clientType per device: '0' all but IP cameras, '1' only IP cameras, '0,1' all. */
    public async listTopologyClientsOfDevices(
        deviceMacs: string[],
        clientType: '0' | '1' | '0,1',
        siteId?: string,
        h?: CustomHeaders
    ): Promise<unknown> {
        const resolvedSiteId = await this.site.resolveSiteId(siteId);
        const filterType = z.enum(['0', '1', '0,1']).parse(clientType);
        const macs = z.array(macSchema).min(1, 'At least one device MAC is required.').max(500).parse(deviceMacs);
        const data = { deviceMacs: macs.map((mac) => ({ mac, filterType })) };
        return await this.call({ url: this.buildPath(`/sites/${resolvedSiteId}/topology/devices/all-clients`, 'v2'), method: 'POST', data }, h);
    }
    public async listTopologyDeviceClients(deviceMac: string, siteId?: string, h?: CustomHeaders): Promise<unknown> {
        const resolvedSiteId = await this.site.resolveSiteId(siteId);
        return await this.call(
            { url: this.buildPath(`/sites/${resolvedSiteId}/topology/devices/${mac(deviceMac)}/clients`, 'v2'), method: 'GET' },
            h
        );
    }
    /** clientType: '0' all but IP cameras, '1' only IP cameras, '0,1' all. */
    public async listTopologyDeviceAllClients(
        deviceMac: string,
        clientType: '0' | '1' | '0,1',
        siteId?: string,
        h?: CustomHeaders
    ): Promise<unknown> {
        const resolvedSiteId = await this.site.resolveSiteId(siteId);
        const params = { 'filters.type': z.enum(['0', '1', '0,1']).parse(clientType) };
        return await this.call(
            { url: this.buildPath(`/sites/${resolvedSiteId}/topology/devices/${mac(deviceMac)}/all-clients`, 'v2'), method: 'GET', params },
            h
        );
    }
    public async getTopologyAvailableNetworks(siteId?: string, h?: CustomHeaders): Promise<unknown> {
        const resolvedSiteId = await this.site.resolveSiteId(siteId);
        return await this.call({ url: this.buildPath(`/sites/${resolvedSiteId}/topology/available-network`, 'v2'), method: 'GET' }, h);
    }
    public async getTopologyAvailableVlans(siteId?: string, h?: CustomHeaders): Promise<unknown> {
        const resolvedSiteId = await this.site.resolveSiteId(siteId);
        return await this.call({ url: this.buildPath(`/sites/${resolvedSiteId}/topology/available-vlans`, 'v2'), method: 'GET' }, h);
    }
    public async listTopologyAvailableSsids(searchKey: string, siteId?: string, h?: CustomHeaders): Promise<unknown[]> {
        const resolvedSiteId = await this.site.resolveSiteId(siteId);
        return await this.request.fetchPaginated<unknown>(
            this.buildPath(`/sites/${resolvedSiteId}/topology/available-ssids`, 'v2'),
            { searchKey },
            h,
            100
        );
    }
    public async getTopologyDiscoveryStatus(siteId?: string, h?: CustomHeaders): Promise<unknown> {
        const resolvedSiteId = await this.site.resolveSiteId(siteId);
        return await this.call({ url: this.buildPath(`/sites/${resolvedSiteId}/topology/discovery/status`, 'v2'), method: 'GET' }, h);
    }
    public async listTopologyIsolatedDevices(siteId?: string, h?: CustomHeaders): Promise<unknown> {
        const resolvedSiteId = await this.site.resolveSiteId(siteId);
        return await this.call({ url: this.buildPath(`/sites/${resolvedSiteId}/topology/isolated-and-pre-config`, 'v2'), method: 'GET' }, h);
    }
    public async searchTopology(searchKey: string, siteId?: string, h?: CustomHeaders): Promise<unknown[]> {
        const resolvedSiteId = await this.site.resolveSiteId(siteId);
        const params = { searchKey: z.string().min(1, 'searchKey is required.').parse(searchKey) };
        return await this.request.fetchPaginated<unknown>(
            this.buildPath(`/sites/${resolvedSiteId}/topology/search-device-client`, 'v2'),
            params,
            h,
            100
        );
    }
    public async listTopologyVlanDevices(networkId: string, vlan: number, siteId?: string, h?: CustomHeaders): Promise<unknown> {
        const resolvedSiteId = await this.site.resolveSiteId(siteId);
        const vlanId = z.number().int().min(1).max(4094).parse(vlan);
        return await this.call(
            { url: this.buildPath(`/sites/${resolvedSiteId}/topology/${seg(networkId)}/vlan/${seg(String(vlanId))}/devices`, 'v3'), method: 'GET' },
            h
        );
    }
    public async listTopologySsidDevices(ssidId: string, siteId?: string, h?: CustomHeaders): Promise<unknown> {
        const resolvedSiteId = await this.site.resolveSiteId(siteId);
        return await this.call({ url: this.buildPath(`/sites/${resolvedSiteId}/topology/ssids/${seg(ssidId)}/devices`, 'v3'), method: 'GET' }, h);
    }

    // ---- Packet capture lookups (starting and stopping a capture acts on the device and is not exposed) ----
    public async listCaptureCapableDevices(
        deviceType: z.input<typeof captureDeviceTypeSchema>,
        siteId?: string,
        h?: CustomHeaders
    ): Promise<unknown[]> {
        const resolvedSiteId = await this.site.resolveSiteId(siteId);
        const type = captureDeviceTypeSchema.parse(deviceType);
        return await this.request.fetchPaginated<unknown>(
            this.buildPath(`/sites/${resolvedSiteId}/capture/all-devices/device-type/${seg(type)}`),
            {},
            h,
            100
        );
    }
    public async listCaptureInterfaces(
        deviceType: z.input<typeof captureDeviceTypeSchema>,
        deviceMac: string,
        siteId?: string,
        h?: CustomHeaders
    ): Promise<unknown> {
        const resolvedSiteId = await this.site.resolveSiteId(siteId);
        const type = captureDeviceTypeSchema.parse(deviceType);
        return await this.call(
            { url: this.buildPath(`/sites/${resolvedSiteId}/capture/device-type/${seg(type)}/${mac(deviceMac)}/interfaces`), method: 'GET' },
            h
        );
    }
    public async getCaptureStatus(
        deviceType: z.input<typeof captureDeviceTypeSchema>,
        deviceMac: string,
        requestId: string,
        siteId?: string,
        h?: CustomHeaders
    ): Promise<unknown> {
        const resolvedSiteId = await this.site.resolveSiteId(siteId);
        const type = captureDeviceTypeSchema.parse(deviceType);
        return await this.call(
            {
                url: this.buildPath(`/sites/${resolvedSiteId}/capture/device-type/${seg(type)}/${mac(deviceMac)}/${seg(requestId)}/status`),
                method: 'GET',
            },
            h
        );
    }
    public async getLastCaptureDevice(siteId?: string, h?: CustomHeaders): Promise<unknown> {
        const resolvedSiteId = await this.site.resolveSiteId(siteId);
        return await this.call({ url: this.buildPath(`/sites/${resolvedSiteId}/capture/lastDevice`), method: 'GET' }, h);
    }

    // ---- Reports ----
    public async getReportEmailSchedule(siteId?: string, h?: CustomHeaders): Promise<unknown> {
        const resolvedSiteId = await this.site.resolveSiteId(siteId);
        return await this.call({ url: this.buildPath(`/sites/${resolvedSiteId}/report/export-schedule-email`, 'v2'), method: 'GET' }, h);
    }
    /** Sends the complete tab objects as read, with their new ranks; partial bodies are not used. */
    public async reorderReportTabs(tabs: ReportTabRecord[], siteId?: string, h?: CustomHeaders): Promise<unknown> {
        const resolvedSiteId = await this.site.resolveSiteId(siteId);
        if (!Array.isArray(tabs) || tabs.length === 0) throw new Error('At least one report tab is required.');
        return await this.call({ url: this.buildPath(`/sites/${resolvedSiteId}/report/reorder`), method: 'PUT', data: tabs }, h);
    }
}

function seg(value: string): string {
    return encodeURIComponent(idSchema.parse(value));
}

function mac(value: string): string {
    return encodeURIComponent(macSchema.parse(value));
}
