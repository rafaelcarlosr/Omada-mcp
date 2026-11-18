import { z } from 'zod';
import type {
    ActiveClientInfo,
    ClientActivity,
    ClientPastConnection,
    ClientRateLimitSetting,
    CustomHeaders,
    GetClientActivityOptions,
    ListClientsPastConnectionsOptions,
    OmadaApiResponse,
    OmadaClientInfo,
    PaginatedResult,
    RateLimitProfile,
    UpdateClientRateLimitRequest,
} from '../types/index.js';

import type { RequestHandler } from './request.js';
import * as schemas from './requestSchemas.js';
import type { SiteOperations } from './site.js';

const clientMacSchema = z.string().regex(/^[0-9a-f]{2}([:-][0-9a-f]{2}){5}$/i, 'A valid client MAC address is required.');
/** Client insight ranges are epoch milliseconds, like the switch and client health routes. */
export const msRangeSchema = z
    .object({ start: z.number().int().nonnegative(), end: z.number().int().nonnegative() })
    .strict()
    .refine((range) => range.start < range.end, 'start must be before end.');
export const clientStatGranularitySchema = z.enum(['5Min', 'hourly', 'daily']);
/** 0 connection, 1 association, 2 roaming, 3 disconnection. */
export const clientTimelineTypeSchema = z.union([z.literal(0), z.literal(1), z.literal(2), z.literal(3)]);

function clientMac(value: string): string {
    return encodeURIComponent(clientMacSchema.parse(value));
}

function normalizeMac(value: string): string | undefined {
    const mac = value.trim();
    if (!/^(?:[\da-f]{12}|(?:[\da-f]{2}:){5}[\da-f]{2}|(?:[\da-f]{2}-){5}[\da-f]{2}|(?:[\da-f]{4}\.){2}[\da-f]{4})$/i.test(mac)) {
        return undefined;
    }
    return mac.replace(/[:.-]/g, '').toLowerCase();
}

/**
 * Client-related operations for the Omada API.
 */
export class ClientOperations {
    constructor(
        private readonly request: RequestHandler,
        private readonly site: SiteOperations,
        private readonly buildPath: (path: string, version?: string) => string
    ) {}

    /**
     * List all clients in a site.
     */
    public async listClients(siteId?: string, customHeaders?: CustomHeaders): Promise<OmadaClientInfo[]> {
        const resolvedSiteId = await this.site.resolveSiteId(siteId);
        return await this.request.fetchPaginated<OmadaClientInfo>(
            this.buildPath(`/sites/${encodeURIComponent(resolvedSiteId)}/clients`),
            {},
            customHeaders
        );
    }

    /**
     * Get an online client by MAC address, client ID, IP, hostName, or name.
     * Name/hostname matching is exact (case-insensitive); ambiguous matches fail.
     */
    public async getClient(identifier: string, siteId?: string, customHeaders?: CustomHeaders): Promise<OmadaClientInfo | undefined> {
        const query = identifier.trim();
        if (!query) {
            throw new Error('Client identifier must not be empty');
        }
        const mac = normalizeMac(query);
        const name = query.toLowerCase();
        const clients = await this.listClients(siteId, customHeaders);
        const matches = clients.filter(
            (client) =>
                client.id === query ||
                (mac !== undefined && typeof client.mac === 'string' && normalizeMac(client.mac) === mac) ||
                client.ip === query ||
                (typeof client.hostName === 'string' && client.hostName.toLowerCase() === name) ||
                (typeof client.name === 'string' && client.name.toLowerCase() === name)
        );
        if (matches.length > 1) {
            throw new Error(
                `Ambiguous client identifier "${query}": matched ${matches.length} clients (${matches.map((client) => client.mac).join(', ')}). Use a unique MAC address or client ID.`
            );
        }
        return matches[0];
    }

    /**
     * Get most active clients in a site (dashboard endpoint).
     * Returns clients sorted by total traffic.
     *
     * @param siteId - Optional site ID, uses default from config if not provided
     * @returns Array of active client information
     */
    public async listMostActiveClients(siteId?: string, customHeaders?: CustomHeaders): Promise<ActiveClientInfo[]> {
        const resolvedSiteId = await this.site.resolveSiteId(siteId);
        const response = await this.request.get<OmadaApiResponse<ActiveClientInfo[]>>(
            this.buildPath(`/sites/${encodeURIComponent(resolvedSiteId)}/dashboard/active-clients`),
            undefined,
            customHeaders
        );
        this.request.ensureSuccess(response);
        return response.result ?? [];
    }

    /**
     * Get client activity statistics over time (dashboard endpoint).
     * Returns time-series data about new, active, and disconnected clients.
     *
     * @param options - Options including optional siteId, start, and end timestamps
     * @returns Array of client activity snapshots over time
     */
    public async listClientsActivity(options: GetClientActivityOptions = {}, customHeaders?: CustomHeaders): Promise<ClientActivity[]> {
        const resolvedSiteId = await this.site.resolveSiteId(options.siteId);
        const params: Record<string, unknown> = {};

        if (options.start !== undefined) {
            params.start = options.start;
        }
        if (options.end !== undefined) {
            params.end = options.end;
        }

        const response = await this.request.get<OmadaApiResponse<ClientActivity[]>>(
            this.buildPath(`/sites/${encodeURIComponent(resolvedSiteId)}/dashboard/client-activity`),
            params,
            customHeaders
        );
        this.request.ensureSuccess(response);
        return response.result ?? [];
    }

    /**
     * Get client past connection list (insight endpoint).
     * Returns historical client connection data with support for pagination, filtering, and sorting.
     *
     * @param options - Options including siteId, pagination, filters, and search parameters
     * @returns Array of client past connection information
     */
    public async listClientsPastConnections(
        options: ListClientsPastConnectionsOptions,
        customHeaders?: CustomHeaders
    ): Promise<ClientPastConnection[]> {
        const resolvedSiteId = await this.site.resolveSiteId(options.siteId);
        const params: Record<string, unknown> = {
            page: options.page,
            pageSize: options.pageSize,
        };

        // Add optional sort parameter
        if (options.sortLastSeen !== undefined) {
            params['sorts.lastSeen'] = options.sortLastSeen;
        }

        // Add optional filter parameters
        if (options.timeStart !== undefined) {
            params['filters.timeStart'] = String(options.timeStart);
        }
        if (options.timeEnd !== undefined) {
            params['filters.timeEnd'] = String(options.timeEnd);
        }
        if (options.guest !== undefined) {
            params['filters.guest'] = String(options.guest);
        }

        // Add optional search parameter
        if (options.searchKey !== undefined) {
            params.searchKey = options.searchKey;
        }

        const response = await this.request.get<OmadaApiResponse<PaginatedResult<ClientPastConnection>>>(
            this.buildPath(`/sites/${encodeURIComponent(resolvedSiteId)}/insight/past-connection`),
            params,
            customHeaders
        );

        const result = this.request.ensureSuccess(response);
        return result.data ?? [];
    }

    /**
     * Get rate limit profile list for a site.
     * Returns available rate limit profiles that can be applied to clients.
     *
     * @param siteId - Optional site ID, uses default from config if not provided
     * @returns Array of rate limit profiles
     */
    public async getRateLimitProfiles(siteId?: string, customHeaders?: CustomHeaders): Promise<RateLimitProfile[]> {
        const resolvedSiteId = await this.site.resolveSiteId(siteId);
        const response = await this.request.get<OmadaApiResponse<RateLimitProfile[]>>(
            this.buildPath(`/sites/${encodeURIComponent(resolvedSiteId)}/rate-limit-profiles`),
            undefined,
            customHeaders
        );
        this.request.ensureSuccess(response);
        return response.result ?? [];
    }

    /**
     * Set custom rate limit for a client.
     * Configures download and upload bandwidth limits directly without using a profile.
     *
     * @param clientMac - MAC address of the client
     * @param downLimit - Download limit in Kbps
     * @param upLimit - Upload limit in Kbps
     * @param siteId - Optional site ID, uses default from config if not provided
     * @returns Updated rate limit setting
     */
    public async setClientRateLimit(
        clientMac: string,
        downLimit: number,
        upLimit: number,
        siteId?: string,
        customHeaders?: CustomHeaders
    ): Promise<ClientRateLimitSetting> {
        const resolvedSiteId = await this.site.resolveSiteId(siteId);
        const requestBody: UpdateClientRateLimitRequest = {
            mode: 0, // 0 = custom rate limit
            customRateLimit: {
                enable: true,
                upEnable: true,
                upLimit: upLimit,
                downEnable: true,
                downLimit: downLimit,
            },
        };

        const response = await this.request.patch<OmadaApiResponse<ClientRateLimitSetting>>(
            this.buildPath(`/sites/${encodeURIComponent(resolvedSiteId)}/clients/${encodeURIComponent(clientMac)}/ratelimit`),
            requestBody,
            customHeaders
        );
        return this.request.ensureSuccess(response);
    }

    /**
     * Set rate limit profile for a client.
     * Applies a predefined rate limit profile to the client.
     *
     * @param clientMac - MAC address of the client
     * @param profileId - Rate limit profile ID
     * @param siteId - Optional site ID, uses default from config if not provided
     * @returns Updated rate limit setting
     */
    public async setClientRateLimitProfile(
        clientMac: string,
        profileId: string,
        siteId?: string,
        customHeaders?: CustomHeaders
    ): Promise<ClientRateLimitSetting> {
        const resolvedSiteId = await this.site.resolveSiteId(siteId);
        const requestBody: UpdateClientRateLimitRequest = {
            mode: 1, // 1 = use rate limit profile
            rateLimitProfileId: profileId,
        };

        const response = await this.request.patch<OmadaApiResponse<ClientRateLimitSetting>>(
            this.buildPath(`/sites/${encodeURIComponent(resolvedSiteId)}/clients/${encodeURIComponent(clientMac)}/ratelimit`),
            requestBody,
            customHeaders
        );
        return this.request.ensureSuccess(response);
    }

    /**
     * Disable rate limit for a client.
     * Removes any rate limiting applied to the client.
     *
     * @param clientMac - MAC address of the client
     * @param siteId - Optional site ID, uses default from config if not provided
     * @returns Updated rate limit setting
     */
    public async disableClientRateLimit(clientMac: string, siteId?: string, customHeaders?: CustomHeaders): Promise<ClientRateLimitSetting> {
        const resolvedSiteId = await this.site.resolveSiteId(siteId);

        // To disable rate limiting, use mode 0 with enable: false and minimal valid limit values
        const requestBody: UpdateClientRateLimitRequest = {
            mode: 0,
            customRateLimit: {
                enable: false,
                upEnable: false,
                upLimit: 1,
                downEnable: false,
                downLimit: 1,
            },
        };

        const response = await this.request.patch<OmadaApiResponse<ClientRateLimitSetting>>(
            this.buildPath(`/sites/${encodeURIComponent(resolvedSiteId)}/clients/${encodeURIComponent(clientMac)}/ratelimit`),
            requestBody,
            customHeaders
        );
        return this.request.ensureSuccess(response);
    }

    /**
     * Get full detail for a single client by MAC address.
     * OperationId: getClientDetail
     */
    public async getClientDetail(clientMac: string, siteId?: string, customHeaders?: CustomHeaders): Promise<unknown> {
        const resolvedSiteId = await this.site.resolveSiteId(siteId);
        const path = this.buildPath(`/sites/${encodeURIComponent(resolvedSiteId)}/clients/${encodeURIComponent(clientMac)}`);
        const response = await this.request.get<OmadaApiResponse<unknown>>(path, undefined, customHeaders);
        return this.request.ensureSuccess(response);
    }

    /**
     * Get historical known clients list (paginated).
     * OperationId: getGridKnownClients
     */
    public async getGridKnownClients(
        page: number,
        pageSize: number,
        options?: { sortLastSeen?: string; timeStart?: string; timeEnd?: string; guest?: string; searchKey?: string },
        siteId?: string,
        customHeaders?: CustomHeaders
    ): Promise<unknown> {
        const resolvedSiteId = await this.site.resolveSiteId(siteId);
        const path = this.buildPath(`/sites/${encodeURIComponent(resolvedSiteId)}/insight/clients`);
        const params: Record<string, unknown> = { page, pageSize };
        if (options?.sortLastSeen !== undefined) params['sorts.lastSeen'] = options.sortLastSeen;
        if (options?.timeStart !== undefined) params['filters.timeStart'] = options.timeStart;
        if (options?.timeEnd !== undefined) params['filters.timeEnd'] = options.timeEnd;
        if (options?.guest !== undefined) params['filters.guest'] = options.guest;
        if (options?.searchKey !== undefined) params.searchKey = options.searchKey;
        const response = await this.request.get<OmadaApiResponse<unknown>>(path, params, customHeaders);
        return this.request.ensureSuccess(response);
    }

    /**
     * Get per-client connection history (paginated).
     * OperationId: getGridClientHistory
     */
    public async getGridClientHistory(
        clientMac: string,
        page: number,
        pageSize: number,
        searchKey?: string,
        siteId?: string,
        customHeaders?: CustomHeaders
    ): Promise<unknown> {
        const resolvedSiteId = await this.site.resolveSiteId(siteId);
        const path = this.buildPath(`/sites/${encodeURIComponent(resolvedSiteId)}/clients/${encodeURIComponent(clientMac)}/client-history`);
        const params: Record<string, unknown> = { page, pageSize };
        if (searchKey !== undefined) params.searchKey = searchKey;
        const response = await this.request.get<OmadaApiResponse<unknown>>(path, params, customHeaders);
        return this.request.ensureSuccess(response);
    }

    /**
     * Get client count distribution by type/band.
     * OperationId: getClientsDistribution
     */
    public async getClientsDistribution(siteId?: string, customHeaders?: CustomHeaders): Promise<unknown> {
        const resolvedSiteId = await this.site.resolveSiteId(siteId);
        const path = this.buildPath(`/sites/${encodeURIComponent(resolvedSiteId)}/dashboard/client-distribution`);
        const response = await this.request.get<OmadaApiResponse<unknown>>(path, undefined, customHeaders);
        return this.request.ensureSuccess(response);
    }

    /**
     * Get historical client count trend over a time range.
     * OperationId: getPastClientNum
     */
    public async getPastClientNum(start: number, end: number, siteId?: string, customHeaders?: CustomHeaders): Promise<unknown> {
        const resolvedSiteId = await this.site.resolveSiteId(siteId);
        const path = this.buildPath(`/sites/${encodeURIComponent(resolvedSiteId)}/dashboard/past-client-num`);
        const response = await this.request.get<OmadaApiResponse<unknown>>(path, { start, end }, customHeaders);
        return this.request.ensureSuccess(response);
    }

    /** Connection and roaming history of one client (docs/openapi/06-client.json, getClientConnectionHistory). */
    public async getClientConnectionHistory(
        mac: string,
        range: z.input<typeof msRangeSchema>,
        siteId?: string,
        customHeaders?: CustomHeaders
    ): Promise<unknown> {
        const { start, end } = msRangeSchema.parse(range);
        const resolvedSiteId = await this.site.resolveSiteId(siteId);
        const path = this.buildPath(`/sites/${encodeURIComponent(resolvedSiteId)}/clients/${clientMac(mac)}/client-connection`);
        return this.request.ensureSuccess(await this.request.get<OmadaApiResponse<unknown>>(path, { start, end }, customHeaders));
    }

    /** Timeline events of one client, filtered by type. */
    public async getClientTimeline(
        mac: string,
        range: z.input<typeof msRangeSchema>,
        type: z.input<typeof clientTimelineTypeSchema>,
        siteId?: string,
        customHeaders?: CustomHeaders
    ): Promise<unknown> {
        const { start, end } = msRangeSchema.parse(range);
        const resolvedSiteId = await this.site.resolveSiteId(siteId);
        const path = this.buildPath(`/sites/${encodeURIComponent(resolvedSiteId)}/clients/${clientMac(mac)}/client-timeline`);
        const params = { start, end, type: clientTimelineTypeSchema.parse(type) };
        return this.request.ensureSuccess(await this.request.get<OmadaApiResponse<unknown>>(path, params, customHeaders));
    }

    /** Client health detail (V2) for a range. */
    public async getClientHealthDetail(
        mac: string,
        range: z.input<typeof msRangeSchema>,
        siteId?: string,
        customHeaders?: CustomHeaders
    ): Promise<unknown> {
        const { start, end } = msRangeSchema.parse(range);
        const resolvedSiteId = await this.site.resolveSiteId(siteId);
        const path = this.buildPath(`/sites/${encodeURIComponent(resolvedSiteId)}/clients/${clientMac(mac)}/health/detail`, 'v2');
        return this.request.ensureSuccess(await this.request.get<OmadaApiResponse<unknown>>(path, { start, end }, customHeaders));
    }

    /** Client health score timeline for a range. */
    public async getClientHealthTimeline(
        mac: string,
        range: z.input<typeof msRangeSchema>,
        siteId?: string,
        customHeaders?: CustomHeaders
    ): Promise<unknown> {
        const { start, end } = msRangeSchema.parse(range);
        const resolvedSiteId = await this.site.resolveSiteId(siteId);
        const path = this.buildPath(`/sites/${encodeURIComponent(resolvedSiteId)}/clients/${clientMac(mac)}/health/timeline`);
        return this.request.ensureSuccess(await this.request.get<OmadaApiResponse<unknown>>(path, { start, end }, customHeaders));
    }

    /** Values available for the client list filters (device types, vendors, ...). */
    public async getClientSearchFieldOptions(siteId?: string, customHeaders?: CustomHeaders): Promise<unknown> {
        const resolvedSiteId = await this.site.resolveSiteId(siteId);
        const path = this.buildPath(`/sites/${encodeURIComponent(resolvedSiteId)}/clients/search-fields-options`);
        return this.request.ensureSuccess(await this.request.get<OmadaApiResponse<unknown>>(path, undefined, customHeaders));
    }

    /** Controller-wide list of client type corrections that can be applied to a client. */
    public async getClientCorrectionOptions(customHeaders?: CustomHeaders): Promise<unknown> {
        const path = this.buildPath('/correction-list');
        return this.request.ensureSuccess(await this.request.get<OmadaApiResponse<unknown>>(path, undefined, customHeaders));
    }

    /** Path from the client through APs and switches to the gateway. */
    public async getClientLinkTopology(mac: string, siteId?: string, customHeaders?: CustomHeaders): Promise<unknown> {
        const resolvedSiteId = await this.site.resolveSiteId(siteId);
        const path = this.buildPath(`/sites/${encodeURIComponent(resolvedSiteId)}/clients/${clientMac(mac)}/client-link-topology`);
        return this.request.ensureSuccess(await this.request.post<OmadaApiResponse<unknown>>(path, {}, customHeaders));
    }

    /** Traffic and signal statistics of one client at 5-minute, hourly or daily granularity (epoch seconds). */
    public async getClientStats(
        mac: string,
        granularity: z.input<typeof clientStatGranularitySchema>,
        query: z.input<typeof schemas.clientStatQuery05Schema>,
        siteId?: string,
        customHeaders?: CustomHeaders
    ): Promise<unknown> {
        const interval = clientStatGranularitySchema.parse(granularity);
        const body = schemas.clientStatQuery05Schema.parse(query);
        const resolvedSiteId = await this.site.resolveSiteId(siteId);
        const path = this.buildPath(`/sites/${encodeURIComponent(resolvedSiteId)}/client-stat-detail/${clientMac(mac)}/${interval}`);
        return this.request.ensureSuccess(await this.request.post<OmadaApiResponse<unknown>>(path, body, customHeaders));
    }

    /** Incident counts for a set of clients. */
    public async getClientIncidentCounts(
        payload: z.input<typeof schemas.clientIncidentCountRequestOpenApiVO05Schema>,
        siteId?: string,
        customHeaders?: CustomHeaders
    ): Promise<unknown> {
        const body = schemas.clientIncidentCountRequestOpenApiVO05Schema.parse(payload);
        const resolvedSiteId = await this.site.resolveSiteId(siteId);
        const path = this.buildPath(`/sites/${encodeURIComponent(resolvedSiteId)}/clients/incidents`);
        return this.request.ensureSuccess(await this.request.post<OmadaApiResponse<unknown>>(path, body, customHeaders));
    }
}
