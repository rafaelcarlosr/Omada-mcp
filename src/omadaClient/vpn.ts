import { z } from 'zod';

import type { CustomHeaders, OmadaApiResponse } from '../types/index.js';
import type { RequestHandler } from './request.js';
import * as schemas from './requestSchemas.js';
import type { SiteOperations } from './site.js';
import type { Input } from './siteConfig.js';

type Method = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

const idSchema = z.string().trim().min(1, 'An identifier is required.');

/** VPN types accepted by the status lists (0 L2TP, 1 PPTP, 2 IPsec, 3 OpenVPN, 4 WireGuard, 5 SSL VPN). */
export const vpnStatusTypeSchema = z.number().int().min(0).max(5);

/** The VPN status lists reject pageSize above 100 (observed on 6.3: "pageSize should between 1 and 100"). */
const STATUS_PAGE_SIZE = 100;

/**
 * VPN routes that are not tied to a single tunnel definition: VPN user accounts
 * (v2 list, v3 writes), SSL VPN server objects, EoGRE and the status lists.
 *
 * Every route is verified against docs/openapi (see tests/omadaClient/vpn.test.ts).
 * Request bodies are parsed with the generated strict schemas before sending.
 */
export class VpnOperations {
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

    private async list(
        siteId: string | undefined,
        suffix: string,
        customHeaders?: CustomHeaders,
        version?: string,
        params: Record<string, unknown> = {},
        pageSize?: number
    ): Promise<unknown[]> {
        return await this.request.fetchPaginated<unknown>(await this.sitePath(siteId, suffix, version), params, customHeaders, pageSize);
    }

    // ---- VPN users (all protocols) ----
    public async listVpnUsers(siteId?: string, h?: CustomHeaders): Promise<unknown[]> {
        return await this.list(siteId, '/vpn/users', h, 'v2');
    }
    public async createVpnUser(payload: Input<typeof schemas.vpnUserConfigVOSchema>, siteId?: string, h?: CustomHeaders): Promise<unknown> {
        return await this.send('POST', siteId, '/vpn/users', schemas.vpnUserConfigVOSchema.parse(payload), h, 'v3');
    }
    public async updateVpnUser(
        userId: string,
        payload: Input<typeof schemas.vpnUserConfigVOSchema>,
        siteId?: string,
        h?: CustomHeaders
    ): Promise<unknown> {
        return await this.send('PATCH', siteId, `/vpn/users/${seg(userId)}`, schemas.vpnUserConfigVOSchema.parse(payload), h, 'v3');
    }
    public async deleteVpnUser(userId: string, siteId?: string, h?: CustomHeaders): Promise<unknown> {
        return await this.send('DELETE', siteId, `/vpn/users/${seg(userId)}`, undefined, h, 'v1');
    }

    // ---- SSL VPN resources ----
    public async listSslVpnResources(siteId?: string, h?: CustomHeaders): Promise<unknown[]> {
        return await this.list(siteId, '/vpn/ssl-vpn-server/resources', h, 'v1');
    }
    public async createSslVpnResource(
        payload: Input<typeof schemas.sslVpnResourceConfigOpenApiVOSchema>,
        siteId?: string,
        h?: CustomHeaders
    ): Promise<unknown> {
        return await this.send('POST', siteId, '/vpn/ssl-vpn-server/resources', schemas.sslVpnResourceConfigOpenApiVOSchema.parse(payload), h, 'v1');
    }
    public async updateSslVpnResource(
        resourceId: string,
        payload: Input<typeof schemas.sslVpnResourceModifyOpenApiVOSchema>,
        siteId?: string,
        h?: CustomHeaders
    ): Promise<unknown> {
        return await this.send(
            'PUT',
            siteId,
            `/vpn/ssl-vpn-server/resources/${seg(resourceId)}`,
            schemas.sslVpnResourceModifyOpenApiVOSchema.parse(payload),
            h,
            'v1'
        );
    }
    public async deleteSslVpnResource(resourceId: string, siteId?: string, h?: CustomHeaders): Promise<unknown> {
        return await this.send('DELETE', siteId, `/vpn/ssl-vpn-server/resources/${seg(resourceId)}`, undefined, h, 'v1');
    }

    // ---- SSL VPN resource groups ----
    public async listSslVpnResourceGroups(siteId?: string, h?: CustomHeaders): Promise<unknown[]> {
        return await this.list(siteId, '/vpn/ssl-vpn-server/resource-groups', h, 'v1');
    }
    public async createSslVpnResourceGroup(
        payload: Input<typeof schemas.sslVpnResourceGroupConfigOpenApiVOSchema>,
        siteId?: string,
        h?: CustomHeaders
    ): Promise<unknown> {
        return await this.send(
            'POST',
            siteId,
            '/vpn/ssl-vpn-server/resource-groups',
            schemas.sslVpnResourceGroupConfigOpenApiVOSchema.parse(payload),
            h,
            'v1'
        );
    }
    public async updateSslVpnResourceGroup(
        groupId: string,
        payload: Input<typeof schemas.sslVpnResourceGroupModifyOpenApiVOSchema>,
        siteId?: string,
        h?: CustomHeaders
    ): Promise<unknown> {
        return await this.send(
            'PUT',
            siteId,
            `/vpn/ssl-vpn-server/resource-groups/${seg(groupId)}`,
            schemas.sslVpnResourceGroupModifyOpenApiVOSchema.parse(payload),
            h,
            'v1'
        );
    }
    public async deleteSslVpnResourceGroup(groupId: string, siteId?: string, h?: CustomHeaders): Promise<unknown> {
        return await this.send('DELETE', siteId, `/vpn/ssl-vpn-server/resource-groups/${seg(groupId)}`, undefined, h, 'v1');
    }

    // ---- SSL VPN user groups ----
    public async listSslVpnUserGroups(siteId?: string, h?: CustomHeaders): Promise<unknown[]> {
        return await this.list(siteId, '/vpn/ssl-vpn-server/user-groups', h, 'v1');
    }
    public async listSslVpnUserGroupUsers(groupId: string, siteId?: string, h?: CustomHeaders): Promise<unknown[]> {
        return await this.list(siteId, `/vpn/usergroups/${seg(groupId)}/users`, h, 'v2');
    }
    public async createSslVpnUserGroup(
        payload: Input<typeof schemas.sslVpnUserGroupConfigOpenApiVOSchema>,
        siteId?: string,
        h?: CustomHeaders
    ): Promise<unknown> {
        return await this.send(
            'POST',
            siteId,
            '/vpn/ssl-vpn-server/user-groups',
            schemas.sslVpnUserGroupConfigOpenApiVOSchema.parse(payload),
            h,
            'v1'
        );
    }
    public async updateSslVpnUserGroup(
        groupId: string,
        payload: Input<typeof schemas.sslVpnUserGroupModifyOpenApiVOSchema>,
        siteId?: string,
        h?: CustomHeaders
    ): Promise<unknown> {
        return await this.send(
            'PUT',
            siteId,
            `/vpn/ssl-vpn-server/user-groups/${seg(groupId)}`,
            schemas.sslVpnUserGroupModifyOpenApiVOSchema.parse(payload),
            h,
            'v1'
        );
    }
    public async deleteSslVpnUserGroup(groupId: string, siteId?: string, h?: CustomHeaders): Promise<unknown> {
        return await this.send('DELETE', siteId, `/vpn/ssl-vpn-server/user-groups/${seg(groupId)}`, undefined, h, 'v1');
    }

    // ---- SSL VPN locks (by username or IP) ----
    public async listSslVpnLocks(siteId?: string, h?: CustomHeaders): Promise<unknown[]> {
        return await this.list(siteId, '/vpn/ssl-vpn-server/locked-users', h, 'v1');
    }
    public async createSslVpnLock(
        payload: Input<typeof schemas.sslVpnLockConfigOpenApiVOSchema>,
        siteId?: string,
        h?: CustomHeaders
    ): Promise<unknown> {
        return await this.send('POST', siteId, '/vpn/ssl-vpn-server/locked-users', schemas.sslVpnLockConfigOpenApiVOSchema.parse(payload), h, 'v1');
    }
    public async updateSslVpnLock(
        lockId: string,
        payload: Input<typeof schemas.sslVpnLockModifyOpenApiVOSchema>,
        siteId?: string,
        h?: CustomHeaders
    ): Promise<unknown> {
        return await this.send(
            'PUT',
            siteId,
            `/vpn/ssl-vpn-server/locked-users/${seg(lockId)}`,
            schemas.sslVpnLockModifyOpenApiVOSchema.parse(payload),
            h,
            'v1'
        );
    }
    public async deleteSslVpnLock(lockId: string, siteId?: string, h?: CustomHeaders): Promise<unknown> {
        return await this.send('DELETE', siteId, `/vpn/ssl-vpn-server/locked-users/${seg(lockId)}`, undefined, h, 'v1');
    }

    // ---- EoGRE tunnel ----
    public async getEoGreTunnelConfig(siteId?: string, h?: CustomHeaders): Promise<unknown> {
        return await this.send('GET', siteId, '/vpn/gre-tunnel', undefined, h, 'v1');
    }
    public async setEoGreTunnelConfig(
        payload: Input<typeof schemas.updateEoGreTunnelSettingOpenApiVOSchema>,
        siteId?: string,
        h?: CustomHeaders
    ): Promise<unknown> {
        return await this.send('PUT', siteId, '/vpn/gre-tunnel', schemas.updateEoGreTunnelSettingOpenApiVOSchema.parse(payload), h, 'v1');
    }

    // ---- Status lists ----
    public async listVpnServerStatus(vpnType: number, clientMode: number | undefined, siteId?: string, h?: CustomHeaders): Promise<unknown[]> {
        const params: Record<string, unknown> = { 'filters.vpnType': vpnStatusTypeSchema.parse(vpnType) };
        if (clientMode !== undefined) params['filters.clientMode'] = z.number().int().min(0).max(1).parse(clientMode);
        return await this.list(siteId, '/setting/vpn/stats/server', h, 'v1', params, STATUS_PAGE_SIZE);
    }
    public async listVpnServerClientStatus(vpnId: string, siteId?: string, h?: CustomHeaders): Promise<unknown[]> {
        return await this.list(siteId, `/setting/vpn/stats/server/${seg(vpnId)}/client`, h, 'v1', {}, STATUS_PAGE_SIZE);
    }
    public async listVpnClientStatus(vpnType: number, siteId?: string, h?: CustomHeaders): Promise<unknown[]> {
        return await this.list(
            siteId,
            '/setting/vpn/stats/client',
            h,
            'v1',
            { 'filters.vpnType': vpnStatusTypeSchema.parse(vpnType) },
            STATUS_PAGE_SIZE
        );
    }
    public async listSiteToSiteVpnStatus(vpnType: number, siteId?: string, h?: CustomHeaders): Promise<unknown[]> {
        return await this.list(
            siteId,
            '/setting/vpn/stats/s2s',
            h,
            'v1',
            { 'filters.vpnType': vpnStatusTypeSchema.parse(vpnType) },
            STATUS_PAGE_SIZE
        );
    }
    public async listSiteToSiteVpnPeerStatus(vpnId: string, siteId?: string, h?: CustomHeaders): Promise<unknown[]> {
        return await this.list(siteId, `/setting/vpn/stats/s2s/${seg(vpnId)}/peer`, h, 'v1', {}, STATUS_PAGE_SIZE);
    }
}

function seg(id: string): string {
    return encodeURIComponent(idSchema.parse(id));
}
