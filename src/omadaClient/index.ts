import { readFileSync } from 'node:fs';
import https from 'node:https';
import axios, { type AxiosInstance, type AxiosRequestConfig } from 'axios';
import type { z } from 'zod';

import type { OmadaConnectionConfig } from '../config.js';
import type {
    ActiveClientInfo,
    ClientActivity,
    ClientPastConnection,
    ClientRateLimitSetting,
    CustomHeaders,
    GetClientActivityOptions,
    GetDeviceStatsOptions,
    GetThreatListOptions,
    ListClientsPastConnectionsOptions,
    OmadaClientInfo,
    OmadaDeviceInfo,
    OmadaDeviceStats,
    OmadaSiteSummary,
    OswStackDetail,
    PaginatedResult,
    RateLimitProfile,
    ThreatInfo,
} from '../types/index.js';

import { AccountOperations } from './account.js';
import { ActionOperations } from './actions.js';
import { ApOperations } from './aps.js';
import { AuthManager } from './auth.js';
import { AuthProfileOperations } from './authProfiles.js';
import { ClientOperations, type clientStatGranularitySchema, type clientTimelineTypeSchema, type msRangeSchema } from './client.js';
import { ControllerOperations } from './controller.js';
import {
    ControllerSettingOperations,
    type clientDetailPayloadSchema,
    type controllerLoggingPayloadSchema,
    type controllerRetentionPayloadSchema,
    type dataRetentionPayloadSchema,
    type generalSettingsPayloadSchema,
    type radiusProxyPayloadSchema,
    type remoteLoggingPayloadSchema,
    type webhookCreatePayloadSchema,
    type webhookTestPayloadSchema,
    type webhookUpdatePayloadSchema,
} from './controllerSettings.js';
import { DashboardOperations, type secondsRangeSchema as dashboardRangeSchema } from './dashboard.js';
import { DeviceOperations } from './device.js';
import {
    type aclOrderTypeSchema,
    FirewallMaintenanceOperations,
    type gatewayCustomAclChangesSchema,
    type urlFilterOrderTypeSchema,
} from './firewallMaintenance.js';
import { GlobalSecurityOperations } from './globalSecurity.js';
import { type authSurveyPayloadSchema, HotspotAdminOperations, type secondsRangeSchema, type VoucherGroupQuery } from './hotspotAdmin.js';
import { InsightOperations, type SiteThreatListOptions } from './insight.js';
import { LanServiceOperations, type lanMulticastPayloadSchema } from './lanServices.js';
import { LogOperations, type LogQueryOptions } from './log.js';
import { LogAdminOperations, type logNotificationBodySchema, type logSelectionSchema } from './logAdmin.js';
import type { FileServerConfig, SiteFileRestoreInfo, SiteRestoreInfo } from './maintenance.js';
import { MaintenanceOperations } from './maintenance.js';
import { type DashboardWindow, MonitorOperations } from './monitor.js';
import {
    type IncidentFilters,
    MonitoringOperations,
    type msRangeSchema as monitoringRangeSchema,
    type reportTabPayloadSchema,
} from './monitoring.js';
import { NetworkOperations, type SsidBasicConfig } from './network.js';
import { NetworkSecurityOperations } from './networkSecurity.js';
import { PortalOperations } from './portals.js';
import {
    type bonjourServicePayloadSchema,
    type ouiProfilePayloadSchema,
    ProfileOperations,
    type serviceTypePayloadSchema,
    type wifiCallingCopySchema,
    type wifiCallingProfilePayloadSchema,
} from './profiles.js';
import { RequestHandler } from './request.js';
import type * as schemas from './requestSchemas.js';
import { ScheduleOperations } from './schedules.js';
import { SecurityOperations } from './security.js';
import { ServiceSettingOperations, type sshSettingPayloadSchema } from './serviceSettings.js';
import { SiteOperations } from './site.js';
import { SiteAdminOperations } from './siteAdmin.js';
import { type Input, type macFilterListSchema, SiteConfigOperations, type urlFilterTypeSchema } from './siteConfig.js';
import {
    type intelliRecoverPayloadSchema,
    type iotRadioPayloadSchema,
    type ipMacBindingPayloadSchema,
    type mailServerPayloadSchema,
    type poeSchedulePayloadSchema,
    SiteServiceOperations,
} from './siteServices.js';
import { SiteTemplateOperations, type siteTemplateCreateSchema } from './siteTemplates.js';
import { type healthRangeSchema, SwitchOperations, type switchGeneralSettingsSchema } from './switches.js';
import { type SwitchPortChange, SwitchPortOperations, type SwitchPortPatch } from './switchPorts.js';
import { scopeTemplatePath } from './templateScope.js';
import { type captureDeviceTypeSchema, type ReportTabRecord, TopologyOperations, type topologyRootNodeSchema } from './topology.js';
import { VpnOperations } from './vpn.js';
import { type SsidSection, WirelessOperations } from './wireless.js';

export type { LogQueryOptions, SiteThreatListOptions };

export type OmadaClientOptions = OmadaConnectionConfig;

/**
 * Main client for interacting with the TP-Link Omada API.
 * Organized by API tag with dedicated operation classes for each domain.
 */
export class OmadaClient {
    private readonly http: AxiosInstance;

    private readonly auth: AuthManager;

    private readonly request: RequestHandler;

    private readonly siteOps: SiteOperations;
    private readonly switchPortOps: SwitchPortOperations;

    private readonly siteConfigOps: SiteConfigOperations;

    private readonly deviceOps: DeviceOperations;

    private readonly clientOps: ClientOperations;

    private readonly securityOps: SecurityOperations;

    private readonly networkOps: NetworkOperations;

    private readonly monitorOps: MonitorOperations;

    private readonly insightOps: InsightOperations;

    private readonly logOps: LogOperations;

    private readonly controllerOps: ControllerOperations;

    private readonly maintenanceOps: MaintenanceOperations;

    private readonly accountOps: AccountOperations;
    private readonly vpnOps: VpnOperations;
    private readonly switchOps: SwitchOperations;
    private readonly apOps: ApOperations;
    private readonly profileOps: ProfileOperations;
    private readonly siteServiceOps: SiteServiceOperations;
    private readonly wirelessOps: WirelessOperations;
    private readonly authProfileOps: AuthProfileOperations;
    private readonly portalOps: PortalOperations;
    private readonly topologyOps: TopologyOperations;
    private readonly serviceSettingOps: ServiceSettingOperations;
    private readonly lanServiceOps: LanServiceOperations;
    private readonly firewallMaintenanceOps: FirewallMaintenanceOperations;
    private readonly networkSecurityOps: NetworkSecurityOperations;
    private readonly globalSecurityOps: GlobalSecurityOperations;
    private readonly siteAdminOps: SiteAdminOperations;
    private readonly controllerSettingOps: ControllerSettingOperations;
    private readonly hotspotAdminOps: HotspotAdminOperations;
    private readonly dashboardOps: DashboardOperations;
    private readonly logAdminOps: LogAdminOperations;
    private readonly monitoringOps: MonitoringOperations;
    private readonly siteTemplateOps: SiteTemplateOperations;

    private readonly scheduleOps: ScheduleOperations;

    private readonly actionOps: ActionOperations;

    private readonly omadacId: string;

    constructor(options: OmadaClientOptions) {
        this.omadacId = options.omadacId;

        const axiosOptions: AxiosRequestConfig = {
            baseURL: options.baseUrl,
            httpsAgent: new https.Agent({ rejectUnauthorized: options.strictSsl, ...(options.caFile ? { ca: readFileSync(options.caFile) } : {}) }),
            maxRedirects: 0,
            headers: {
                'Content-Type': 'application/json',
                Accept: 'application/json',
            },
        };

        if (options.requestTimeout) {
            axiosOptions.timeout = options.requestTimeout;
        }

        this.http = axios.create(axiosOptions);

        // Initialize operation modules
        this.auth = new AuthManager(this.http, options.clientId, options.clientSecret, options.omadacId);
        this.request = new RequestHandler(this.http, this.auth);
        this.siteOps = new SiteOperations(this.request, this.buildOmadaPath.bind(this), options.siteId);
        this.switchPortOps = new SwitchPortOperations(this.request, this.siteOps, this.buildOmadaPath.bind(this));
        this.siteConfigOps = new SiteConfigOperations(this.request, this.siteOps, this.buildOmadaPath.bind(this));
        this.deviceOps = new DeviceOperations(this.request, this.siteOps, this.buildOmadaPath.bind(this));
        this.clientOps = new ClientOperations(this.request, this.siteOps, this.buildOmadaPath.bind(this));
        this.securityOps = new SecurityOperations(this.request, this.buildOmadaPath.bind(this));
        this.networkOps = new NetworkOperations(this.request, this.siteOps, this.buildOmadaPath.bind(this));
        this.monitorOps = new MonitorOperations(this.request, this.siteOps, this.buildOmadaPath.bind(this));
        this.insightOps = new InsightOperations(this.request, this.siteOps, this.buildOmadaPath.bind(this));
        this.logOps = new LogOperations(this.request, this.siteOps, this.buildOmadaPath.bind(this));
        this.controllerOps = new ControllerOperations(this.request, this.buildOmadaPath.bind(this));
        this.maintenanceOps = new MaintenanceOperations(this.request, this.siteOps, this.buildOmadaPath.bind(this));
        this.accountOps = new AccountOperations(this.request, this.buildOmadaPath.bind(this));
        this.vpnOps = new VpnOperations(this.request, this.siteOps, this.buildOmadaPath.bind(this));
        this.switchOps = new SwitchOperations(this.request, this.siteOps, this.buildOmadaPath.bind(this));
        this.apOps = new ApOperations(this.request, this.siteOps, this.buildOmadaPath.bind(this));
        this.profileOps = new ProfileOperations(this.request, this.siteOps, this.buildOmadaPath.bind(this));
        this.siteServiceOps = new SiteServiceOperations(this.request, this.siteOps, this.buildOmadaPath.bind(this));
        this.wirelessOps = new WirelessOperations(this.request, this.siteOps, this.buildOmadaPath.bind(this));
        this.authProfileOps = new AuthProfileOperations(this.request, this.siteOps, this.buildOmadaPath.bind(this));
        this.portalOps = new PortalOperations(this.request, this.siteOps, this.buildOmadaPath.bind(this));
        this.topologyOps = new TopologyOperations(this.request, this.siteOps, this.buildOmadaPath.bind(this));
        this.serviceSettingOps = new ServiceSettingOperations(this.request, this.siteOps, this.buildOmadaPath.bind(this));
        this.lanServiceOps = new LanServiceOperations(this.request, this.siteOps, this.buildOmadaPath.bind(this));
        this.firewallMaintenanceOps = new FirewallMaintenanceOperations(this.request, this.siteOps, this.buildOmadaPath.bind(this));
        this.networkSecurityOps = new NetworkSecurityOperations(this.request, this.siteOps, this.buildOmadaPath.bind(this));
        this.globalSecurityOps = new GlobalSecurityOperations(this.request, (path) => this.buildOmadaPath(path));
        this.siteAdminOps = new SiteAdminOperations(this.request, this.siteOps, this.buildOmadaPath.bind(this));
        this.controllerSettingOps = new ControllerSettingOperations(this.request, this.siteOps, this.buildOmadaPath.bind(this));
        this.hotspotAdminOps = new HotspotAdminOperations(this.request, this.siteOps, this.buildOmadaPath.bind(this));
        this.dashboardOps = new DashboardOperations(this.request, this.siteOps, this.buildOmadaPath.bind(this));
        this.logAdminOps = new LogAdminOperations(this.request, this.siteOps, this.buildOmadaPath.bind(this));
        this.monitoringOps = new MonitoringOperations(this.request, this.siteOps, this.buildOmadaPath.bind(this));
        this.siteTemplateOps = new SiteTemplateOperations(this.request, this.buildOmadaPath.bind(this));
        this.scheduleOps = new ScheduleOperations(this.request, this.siteOps, this.buildOmadaPath.bind(this));
        this.actionOps = new ActionOperations(this.request, this.siteOps, this.buildOmadaPath.bind(this));
    }

    public async updateSsidBasicConfig(
        wlanId: string,
        ssidId: string,
        payload: SsidBasicConfig,
        siteId?: string,
        customHeaders?: CustomHeaders
    ): Promise<unknown> {
        return await this.networkOps.updateSsidBasicConfig(wlanId, ssidId, payload, siteId, customHeaders);
    }

    // Site operations
    public async resolveSiteId(siteId?: string): Promise<string> {
        return await this.siteOps.resolveSiteId(siteId);
    }

    public async listSites(customHeaders?: CustomHeaders): Promise<OmadaSiteSummary[]> {
        return await this.siteOps.listSites(customHeaders);
    }

    // Device operations
    public async setSwitchPorts(
        switchMac: string,
        ports: number[],
        change: SwitchPortChange,
        siteId?: string,
        customHeaders?: CustomHeaders
    ): Promise<unknown> {
        return await this.switchPortOps.setSwitchPorts(switchMac, ports, change, siteId, customHeaders);
    }

    public async patchSwitchPort(
        switchMac: string,
        port: number,
        body: SwitchPortPatch,
        siteId?: string,
        customHeaders?: CustomHeaders
    ): Promise<unknown> {
        return await this.switchPortOps.patchSwitchPort(switchMac, port, body, siteId, customHeaders);
    }

    public async listDevices(siteId?: string, customHeaders?: CustomHeaders): Promise<OmadaDeviceInfo[]> {
        return await this.deviceOps.listDevices(siteId, customHeaders);
    }

    public async getDevice(identifier: string, siteId?: string, customHeaders?: CustomHeaders): Promise<OmadaDeviceInfo | undefined> {
        return await this.deviceOps.getDevice(identifier, siteId, customHeaders);
    }

    public async getSwitchStackDetail(stackId: string, siteId?: string, customHeaders?: CustomHeaders): Promise<OswStackDetail> {
        return await this.deviceOps.getSwitchStackDetail(stackId, siteId, customHeaders);
    }

    public async searchDevices(searchKey: string, customHeaders?: CustomHeaders): Promise<OmadaDeviceInfo[]> {
        return await this.deviceOps.searchDevices(searchKey, customHeaders);
    }

    public async listDevicesStats(options: GetDeviceStatsOptions, customHeaders?: CustomHeaders): Promise<OmadaDeviceStats> {
        return await this.deviceOps.listDevicesStats(options, customHeaders);
    }

    // Client operations
    public async listClients(siteId?: string, customHeaders?: CustomHeaders): Promise<OmadaClientInfo[]> {
        return await this.clientOps.listClients(siteId, customHeaders);
    }

    public async getClient(identifier: string, siteId?: string, customHeaders?: CustomHeaders): Promise<OmadaClientInfo | undefined> {
        return await this.clientOps.getClient(identifier, siteId, customHeaders);
    }

    public async listMostActiveClients(siteId?: string, customHeaders?: CustomHeaders): Promise<ActiveClientInfo[]> {
        return await this.clientOps.listMostActiveClients(siteId, customHeaders);
    }

    public async listClientsActivity(options?: GetClientActivityOptions, customHeaders?: CustomHeaders): Promise<ClientActivity[]> {
        return await this.clientOps.listClientsActivity(options, customHeaders);
    }

    public async listClientsPastConnections(
        options: ListClientsPastConnectionsOptions,
        customHeaders?: CustomHeaders
    ): Promise<ClientPastConnection[]> {
        return await this.clientOps.listClientsPastConnections(options, customHeaders);
    }

    // Rate limit operations
    public async getRateLimitProfiles(siteId?: string, customHeaders?: CustomHeaders): Promise<RateLimitProfile[]> {
        return await this.clientOps.getRateLimitProfiles(siteId, customHeaders);
    }

    public async setClientRateLimit(
        clientMac: string,
        downLimit: number,
        upLimit: number,
        siteId?: string,
        customHeaders?: CustomHeaders,
        unit: 1 | 2 = 1
    ): Promise<ClientRateLimitSetting> {
        return await this.clientOps.setClientRateLimit(clientMac, downLimit, upLimit, siteId, customHeaders, unit);
    }

    public async setClientRateLimitProfile(
        clientMac: string,
        profileId: string,
        siteId?: string,
        customHeaders?: CustomHeaders
    ): Promise<ClientRateLimitSetting> {
        return await this.clientOps.setClientRateLimitProfile(clientMac, profileId, siteId, customHeaders);
    }

    public async disableClientRateLimit(clientMac: string, siteId?: string, customHeaders?: CustomHeaders): Promise<ClientRateLimitSetting> {
        return await this.clientOps.disableClientRateLimit(clientMac, siteId, customHeaders);
    }

    public async getClientDetail(clientMac: string, siteId?: string, customHeaders?: CustomHeaders): Promise<unknown> {
        return await this.clientOps.getClientDetail(clientMac, siteId, customHeaders);
    }

    public async getGridKnownClients(
        page: number,
        pageSize: number,
        options?: { sortLastSeen?: string; timeStart?: string; timeEnd?: string; guest?: string; searchKey?: string },
        siteId?: string,
        customHeaders?: CustomHeaders
    ): Promise<unknown> {
        return await this.clientOps.getGridKnownClients(page, pageSize, options, siteId, customHeaders);
    }

    public async getGridClientHistory(
        clientMac: string,
        page: number,
        pageSize: number,
        searchKey?: string,
        siteId?: string,
        customHeaders?: CustomHeaders
    ): Promise<unknown> {
        return await this.clientOps.getGridClientHistory(clientMac, page, pageSize, searchKey, siteId, customHeaders);
    }

    public async getClientsDistribution(siteId?: string, customHeaders?: CustomHeaders): Promise<unknown> {
        return await this.clientOps.getClientsDistribution(siteId, customHeaders);
    }

    public async getPastClientNum(start: number, end: number, siteId?: string, customHeaders?: CustomHeaders): Promise<unknown> {
        return await this.clientOps.getPastClientNum(start, end, siteId, customHeaders);
    }

    // Security operations
    public async getThreatList(options: GetThreatListOptions, customHeaders?: CustomHeaders): Promise<PaginatedResult<ThreatInfo>> {
        return await this.securityOps.getThreatList(options, customHeaders);
    }

    // Network operations
    public async getInternetInfo(siteId?: string, customHeaders?: CustomHeaders): Promise<unknown> {
        return await this.networkOps.getInternetInfo(siteId, customHeaders);
    }

    public async getPortForwardingStatus(
        type: 'user' | 'upnp',
        siteId?: string,
        page = 1,
        pageSize = 10,
        customHeaders?: CustomHeaders
    ): Promise<PaginatedResult<unknown>> {
        return await this.networkOps.getPortForwardingStatus(type, siteId, page, pageSize, customHeaders);
    }

    public async getLanNetworkList(siteId?: string, customHeaders?: CustomHeaders): Promise<unknown[]> {
        return await this.networkOps.getLanNetworkList(siteId, customHeaders);
    }

    public async getLanProfileList(siteId?: string, customHeaders?: CustomHeaders): Promise<unknown[]> {
        return await this.networkOps.getLanProfileList(siteId, customHeaders);
    }

    public async getWlanGroupList(siteId?: string, customHeaders?: CustomHeaders): Promise<unknown[]> {
        return await this.networkOps.getWlanGroupList(siteId, customHeaders);
    }

    public async getSsidList(wlanId: string, siteId?: string, customHeaders?: CustomHeaders): Promise<unknown[]> {
        return await this.networkOps.getSsidList(wlanId, siteId, customHeaders);
    }

    public async getSsidDetail(wlanId: string, ssidId: string, siteId?: string, customHeaders?: CustomHeaders): Promise<unknown> {
        return await this.networkOps.getSsidDetail(wlanId, ssidId, siteId, customHeaders);
    }

    public async getFirewallSetting(siteId?: string, customHeaders?: CustomHeaders): Promise<unknown> {
        return await this.networkOps.getFirewallSetting(siteId, customHeaders);
    }

    public async setFirewallSetting(payload: unknown, siteId?: string, customHeaders?: CustomHeaders): Promise<unknown> {
        return await this.networkOps.setFirewallSetting(payload, siteId, customHeaders);
    }

    public async getSwitchDetail(switchMac: string, siteId?: string, customHeaders?: CustomHeaders): Promise<unknown> {
        return await this.deviceOps.getSwitchDetail(switchMac, siteId, customHeaders);
    }

    public async getGatewayDetail(gatewayMac: string, siteId?: string, customHeaders?: CustomHeaders): Promise<unknown> {
        return await this.deviceOps.getGatewayDetail(gatewayMac, siteId, customHeaders);
    }

    public async getGatewayWanStatus(gatewayMac: string, siteId?: string, customHeaders?: CustomHeaders): Promise<unknown> {
        return await this.deviceOps.getGatewayWanStatus(gatewayMac, siteId, customHeaders);
    }

    public async getGatewayLanStatus(gatewayMac: string, siteId?: string, customHeaders?: CustomHeaders): Promise<unknown> {
        return await this.deviceOps.getGatewayLanStatus(gatewayMac, siteId, customHeaders);
    }

    public async getGatewayPorts(gatewayMac: string, siteId?: string, customHeaders?: CustomHeaders): Promise<unknown[]> {
        return await this.deviceOps.getGatewayPorts(gatewayMac, siteId, customHeaders);
    }

    public async getApDetail(apMac: string, siteId?: string, customHeaders?: CustomHeaders): Promise<unknown> {
        return await this.deviceOps.getApDetail(apMac, siteId, customHeaders);
    }

    public async getApRadios(apMac: string, siteId?: string, customHeaders?: CustomHeaders): Promise<unknown> {
        return await this.deviceOps.getApRadios(apMac, siteId, customHeaders);
    }

    public async getStackPorts(stackId: string, siteId?: string, customHeaders?: CustomHeaders): Promise<unknown[]> {
        return await this.deviceOps.getStackPorts(stackId, siteId, customHeaders);
    }

    public async listPendingDevices(siteId?: string, customHeaders?: CustomHeaders): Promise<unknown[]> {
        return await this.deviceOps.listPendingDevices(siteId, customHeaders);
    }

    // Device Management — Phase 1 Read Tools (issue #36)
    public async getAllDeviceBySite(siteId?: string, customHeaders?: CustomHeaders): Promise<unknown[]> {
        return await this.deviceOps.getAllDeviceBySite(siteId, customHeaders);
    }
    public async getFirmwareInfo(deviceMac: string, siteId?: string, customHeaders?: CustomHeaders): Promise<unknown> {
        return await this.deviceOps.getFirmwareInfo(deviceMac, siteId, customHeaders);
    }

    public async rebootDevice(deviceMac: string, siteId?: string, customHeaders?: CustomHeaders): Promise<unknown> {
        return await this.actionOps.rebootDevice(deviceMac, siteId, customHeaders);
    }

    public async blockClient(clientMac: string, siteId?: string, customHeaders?: CustomHeaders): Promise<unknown> {
        return await this.actionOps.blockClient(clientMac, siteId, customHeaders);
    }

    public async unblockClient(clientMac: string, siteId?: string, customHeaders?: CustomHeaders): Promise<unknown> {
        return await this.actionOps.unblockClient(clientMac, siteId, customHeaders);
    }

    public async reconnectClient(clientMac: string, siteId?: string, customHeaders?: CustomHeaders): Promise<unknown> {
        return await this.actionOps.reconnectClient(clientMac, siteId, customHeaders);
    }

    public async setDeviceLed(deviceMac: string, ledSetting: number, siteId?: string, customHeaders?: CustomHeaders): Promise<unknown> {
        return await this.actionOps.setDeviceLed(deviceMac, ledSetting, siteId, customHeaders);
    }
    public async getGridAutoCheckUpgrade(page: number, pageSize: number, customHeaders?: CustomHeaders): Promise<unknown> {
        return await this.deviceOps.getGridAutoCheckUpgrade(page, pageSize, customHeaders);
    }
    public async listSwitchNetworks(
        switchMac: string,
        page: number,
        pageSize: number,
        siteId?: string,
        customHeaders?: CustomHeaders
    ): Promise<unknown> {
        return await this.deviceOps.listSwitchNetworks(switchMac, page, pageSize, siteId, customHeaders);
    }
    public async getSwitchGeneralConfig(switchMac: string, siteId?: string, customHeaders?: CustomHeaders): Promise<unknown> {
        return await this.deviceOps.getSwitchGeneralConfig(switchMac, siteId, customHeaders);
    }
    public async getCableTestLogs(switchMac: string, siteId?: string, customHeaders?: CustomHeaders): Promise<unknown> {
        return await this.deviceOps.getCableTestLogs(switchMac, siteId, customHeaders);
    }
    public async getCableTestFullResults(switchMac: string, siteId?: string, customHeaders?: CustomHeaders): Promise<unknown> {
        return await this.deviceOps.getCableTestFullResults(switchMac, siteId, customHeaders);
    }
    public async getOswStackLagList(stackId: string, siteId?: string, customHeaders?: CustomHeaders): Promise<unknown[]> {
        return await this.deviceOps.getOswStackLagList(stackId, siteId, customHeaders);
    }
    public async getStackNetworkList(
        stackId: string,
        page: number,
        pageSize: number,
        siteId?: string,
        customHeaders?: CustomHeaders
    ): Promise<unknown> {
        return await this.deviceOps.getStackNetworkList(stackId, page, pageSize, siteId, customHeaders);
    }
    public async getApUplinkConfig(apMac: string, siteId?: string, customHeaders?: CustomHeaders): Promise<unknown[]> {
        return await this.deviceOps.getApUplinkConfig(apMac, siteId, customHeaders);
    }
    public async getRadiosConfig(apMac: string, siteId?: string, customHeaders?: CustomHeaders): Promise<unknown> {
        return await this.deviceOps.getRadiosConfig(apMac, siteId, customHeaders);
    }
    public async getApVlanConfig(apMac: string, siteId?: string, customHeaders?: CustomHeaders): Promise<unknown> {
        return await this.deviceOps.getApVlanConfig(apMac, siteId, customHeaders);
    }
    public async getMeshStatistics(apMac: string, siteId?: string, customHeaders?: CustomHeaders): Promise<unknown> {
        return await this.deviceOps.getMeshStatistics(apMac, siteId, customHeaders);
    }
    public async getRFScanResult(apMac: string, siteId?: string, customHeaders?: CustomHeaders): Promise<unknown> {
        return await this.deviceOps.getRFScanResult(apMac, siteId, customHeaders);
    }
    public async getSpeedTestResults(apMac: string, siteId?: string, customHeaders?: CustomHeaders): Promise<unknown> {
        return await this.deviceOps.getSpeedTestResults(apMac, siteId, customHeaders);
    }
    public async getApSnmpConfig(apMac: string, siteId?: string, customHeaders?: CustomHeaders): Promise<unknown> {
        return await this.deviceOps.getApSnmpConfig(apMac, siteId, customHeaders);
    }
    public async getApLldpConfig(apMac: string, siteId?: string, customHeaders?: CustomHeaders): Promise<unknown> {
        return await this.deviceOps.getApLldpConfig(apMac, siteId, customHeaders);
    }
    public async getApGeneralConfig(apMac: string, siteId?: string, customHeaders?: CustomHeaders): Promise<unknown> {
        return await this.deviceOps.getApGeneralConfig(apMac, siteId, customHeaders);
    }
    public async setApGeneralConfig(apMac: string, payload: unknown, siteId?: string, customHeaders?: CustomHeaders): Promise<unknown> {
        return await this.deviceOps.setApGeneralConfig(apMac, payload, siteId, customHeaders);
    }
    public async getUplinkWiredDetail(apMac: string, siteId?: string, customHeaders?: CustomHeaders): Promise<unknown> {
        return await this.deviceOps.getUplinkWiredDetail(apMac, siteId, customHeaders);
    }
    public async getDownlinkWiredDevices(apMac: string, siteId?: string, customHeaders?: CustomHeaders): Promise<unknown[]> {
        return await this.deviceOps.getDownlinkWiredDevices(apMac, siteId, customHeaders);
    }

    // Device Management — Phase 2 Read Tools (issue #73)

    // devices-general
    public async getFirmwareUpgradePlan(page: number, pageSize: number, customHeaders?: CustomHeaders): Promise<unknown> {
        return await this.deviceOps.getFirmwareUpgradePlan(page, pageSize, customHeaders);
    }
    public async getUpgradeLogs(page: number, pageSize: number, customHeaders?: CustomHeaders): Promise<unknown> {
        return await this.deviceOps.getUpgradeLogs(page, pageSize, customHeaders);
    }
    public async getDeviceTagList(siteId?: string, customHeaders?: CustomHeaders): Promise<unknown> {
        return await this.deviceOps.getDeviceTagList(siteId, customHeaders);
    }

    // devices-ap
    public async getApQosConfig(apMac: string, siteId?: string, customHeaders?: CustomHeaders): Promise<unknown> {
        return await this.deviceOps.getApQosConfig(apMac, siteId, customHeaders);
    }
    public async setApQosConfig(apMac: string, payload: unknown, siteId?: string, customHeaders?: CustomHeaders): Promise<unknown> {
        return await this.deviceOps.setApQosConfig(apMac, payload, siteId, customHeaders);
    }
    public async getApIpv6Config(apMac: string, siteId?: string, customHeaders?: CustomHeaders): Promise<unknown> {
        return await this.deviceOps.getApIpv6Config(apMac, siteId, customHeaders);
    }
    public async setApIpv6Config(apMac: string, payload: unknown, siteId?: string, customHeaders?: CustomHeaders): Promise<unknown> {
        return await this.deviceOps.setApIpv6Config(apMac, payload, siteId, customHeaders);
    }

    // Device operations — Phase 2 additional

    public async getSitesGatewaysGeneralConfig(gatewayMac: string, siteId?: string, customHeaders?: CustomHeaders): Promise<unknown> {
        return await this.deviceOps.getSitesGatewaysGeneralConfig(gatewayMac, siteId, customHeaders);
    }

    public async setSitesGatewaysGeneralConfig(
        gatewayMac: string,
        payload: unknown,
        siteId?: string,
        customHeaders?: CustomHeaders
    ): Promise<unknown> {
        return await this.deviceOps.setSitesGatewaysGeneralConfig(gatewayMac, payload, siteId, customHeaders);
    }

    public async setSitesGatewaysConfigGeneral(
        gatewayMac: string,
        payload: unknown,
        siteId?: string,
        customHeaders?: CustomHeaders
    ): Promise<unknown> {
        return await this.deviceOps.setSitesGatewaysConfigGeneral(gatewayMac, payload, siteId, customHeaders);
    }

    public async setSitesGatewaysConfigServices(
        gatewayMac: string,
        payload: unknown,
        siteId?: string,
        customHeaders?: CustomHeaders
    ): Promise<unknown> {
        return await this.deviceOps.setSitesGatewaysConfigServices(gatewayMac, payload, siteId, customHeaders);
    }

    public async setSitesGatewaysConfigAdvanced(
        gatewayMac: string,
        payload: unknown,
        siteId?: string,
        customHeaders?: CustomHeaders
    ): Promise<unknown> {
        return await this.deviceOps.setSitesGatewaysConfigAdvanced(gatewayMac, payload, siteId, customHeaders);
    }

    public async setSitesGatewaysConfigRadios(
        gatewayMac: string,
        payload: unknown,
        siteId?: string,
        customHeaders?: CustomHeaders
    ): Promise<unknown> {
        return await this.deviceOps.setSitesGatewaysConfigRadios(gatewayMac, payload, siteId, customHeaders);
    }

    public async setSitesGatewaysConfigWlans(gatewayMac: string, payload: unknown, siteId?: string, customHeaders?: CustomHeaders): Promise<unknown> {
        return await this.deviceOps.setSitesGatewaysConfigWlans(gatewayMac, payload, siteId, customHeaders);
    }

    public async setSitesGatewaysPortConfig(
        gatewayMac: string,
        portName: string,
        payload: unknown,
        siteId?: string,
        customHeaders?: CustomHeaders
    ): Promise<unknown> {
        return await this.deviceOps.setSitesGatewaysPortConfig(gatewayMac, portName, payload, siteId, customHeaders);
    }

    public async setSitesGatewaysMultiPortsConfig(
        gatewayMac: string,
        payload: unknown,
        siteId?: string,
        customHeaders?: CustomHeaders
    ): Promise<unknown> {
        return await this.deviceOps.setSitesGatewaysMultiPortsConfig(gatewayMac, payload, siteId, customHeaders);
    }

    public async getSitesGatewaysPin(gatewayMac: string, siteId?: string, customHeaders?: CustomHeaders): Promise<unknown> {
        return await this.deviceOps.getSitesGatewaysPin(gatewayMac, siteId, customHeaders);
    }

    public async getSitesGatewaysSimCardUsed(gatewayMac: string, siteId?: string, customHeaders?: CustomHeaders): Promise<unknown> {
        return await this.deviceOps.getSitesGatewaysSimCardUsed(gatewayMac, siteId, customHeaders);
    }

    public async getSitesHealthGatewaysWansDetails(gatewayMac: string, siteId?: string, customHeaders?: CustomHeaders): Promise<unknown> {
        return await this.deviceOps.getSitesHealthGatewaysWansDetails(gatewayMac, siteId, customHeaders);
    }

    public async getSitesApsIpSetting(apMac: string, siteId?: string, customHeaders?: CustomHeaders): Promise<unknown> {
        return await this.deviceOps.getSitesApsIpSetting(apMac, siteId, customHeaders);
    }

    public async setSitesApsIpSetting(apMac: string, payload: unknown, siteId?: string, customHeaders?: CustomHeaders): Promise<unknown> {
        return await this.deviceOps.setSitesApsIpSetting(apMac, payload, siteId, customHeaders);
    }

    public async getSitesApsChannelLimit(apMac: string, siteId?: string, customHeaders?: CustomHeaders): Promise<unknown> {
        return await this.deviceOps.getSitesApsChannelLimit(apMac, siteId, customHeaders);
    }

    public async getSitesApsAvailableChannel(apMac: string, siteId?: string, customHeaders?: CustomHeaders): Promise<unknown> {
        return await this.deviceOps.getSitesApsAvailableChannel(apMac, siteId, customHeaders);
    }

    public async setApChannelConfig(apMac: string, payload: unknown, siteId?: string, customHeaders?: CustomHeaders): Promise<unknown> {
        return await this.deviceOps.setApChannelConfig(apMac, payload, siteId, customHeaders);
    }

    public async getAfcConfig(apMac: string, siteId?: string, customHeaders?: CustomHeaders): Promise<unknown> {
        return await this.deviceOps.getAfcConfig(apMac, siteId, customHeaders);
    }

    public async setAfcConfig(apMac: string, payload: unknown, siteId?: string, customHeaders?: CustomHeaders): Promise<unknown> {
        return await this.deviceOps.setAfcConfig(apMac, payload, siteId, customHeaders);
    }

    public async getSitesApsLoadBalance(apMac: string, siteId?: string, customHeaders?: CustomHeaders): Promise<unknown> {
        return await this.deviceOps.getSitesApsLoadBalance(apMac, siteId, customHeaders);
    }

    public async setSitesApsLoadBalance(apMac: string, payload: unknown, siteId?: string, customHeaders?: CustomHeaders): Promise<unknown> {
        return await this.deviceOps.setSitesApsLoadBalance(apMac, payload, siteId, customHeaders);
    }

    public async getSitesApsOfdma(apMac: string, siteId?: string, customHeaders?: CustomHeaders): Promise<unknown> {
        return await this.deviceOps.getSitesApsOfdma(apMac, siteId, customHeaders);
    }

    public async setSitesApsOfdma(apMac: string, payload: unknown, siteId?: string, customHeaders?: CustomHeaders): Promise<unknown> {
        return await this.deviceOps.setSitesApsOfdma(apMac, payload, siteId, customHeaders);
    }

    public async getSitesApsPowerSaving(apMac: string, siteId?: string, customHeaders?: CustomHeaders): Promise<unknown> {
        return await this.deviceOps.getSitesApsPowerSaving(apMac, siteId, customHeaders);
    }

    public async setSitesApsPowerSaving(
        apMac: string,
        payload: {
            timeEnable: boolean;
            bandEnable: boolean;
            startTimeH?: number;
            startTimeM?: number;
            endTimeH?: number;
            endTimeM?: number;
            bands?: number[];
            idleDuration?: number;
        },
        siteId?: string,
        customHeaders?: CustomHeaders
    ): Promise<unknown> {
        return await this.deviceOps.setSitesApsPowerSaving(apMac, payload, siteId, customHeaders);
    }

    public async getSitesApsTrunkSetting(apMac: string, siteId?: string, customHeaders?: CustomHeaders): Promise<unknown> {
        return await this.deviceOps.getSitesApsTrunkSetting(apMac, siteId, customHeaders);
    }

    public async setSitesApsTrunkSetting(apMac: string, payload: unknown, siteId?: string, customHeaders?: CustomHeaders): Promise<unknown> {
        return await this.deviceOps.setSitesApsTrunkSetting(apMac, payload, siteId, customHeaders);
    }

    public async setSitesApsChannelLimit(
        apMac: string,
        payload: {
            channelLimitType: number;
        },
        siteId?: string,
        customHeaders?: CustomHeaders
    ): Promise<unknown> {
        return await this.deviceOps.setSitesApsChannelLimit(apMac, payload, siteId, customHeaders);
    }

    public async getSitesApsBridge(apMac: string, siteId?: string, customHeaders?: CustomHeaders): Promise<unknown> {
        return await this.deviceOps.getSitesApsBridge(apMac, siteId, customHeaders);
    }

    public async setSitesApsBridge(apMac: string, payload: unknown, siteId?: string, customHeaders?: CustomHeaders): Promise<unknown> {
        return await this.deviceOps.setSitesApsBridge(apMac, payload, siteId, customHeaders);
    }

    public async setRadiosConfig(apMac: string, payload: unknown, siteId?: string, customHeaders?: CustomHeaders): Promise<unknown> {
        return await this.deviceOps.setRadiosConfig(apMac, payload, siteId, customHeaders);
    }

    public async listSitesApsPorts(apMac: string, siteId?: string, customHeaders?: CustomHeaders): Promise<unknown[]> {
        return await this.deviceOps.listSitesApsPorts(apMac, siteId, customHeaders);
    }

    public async setSitesApsPortConfig(apMac: string, payload: unknown, siteId?: string, customHeaders?: CustomHeaders): Promise<unknown> {
        return await this.deviceOps.setSitesApsPortConfig(apMac, payload, siteId, customHeaders);
    }

    public async setApServiceConfig(apMac: string, payload: unknown, siteId?: string, customHeaders?: CustomHeaders): Promise<unknown> {
        return await this.deviceOps.setApServiceConfig(apMac, payload, siteId, customHeaders);
    }

    public async setApWlanGroup(apMac: string, payload: unknown, siteId?: string, customHeaders?: CustomHeaders): Promise<unknown> {
        return await this.deviceOps.setApWlanGroup(apMac, payload, siteId, customHeaders);
    }

    public async getAntennaGainConfig(apMac: string, siteId?: string, customHeaders?: CustomHeaders): Promise<unknown> {
        return await this.deviceOps.getAntennaGainConfig(apMac, siteId, customHeaders);
    }

    public async setAntennaGainConfig(apMac: string, payload: unknown, siteId?: string, customHeaders?: CustomHeaders): Promise<unknown> {
        return await this.deviceOps.setAntennaGainConfig(apMac, payload, siteId, customHeaders);
    }

    public async getSitesSwitchesEs(switchMac: string, siteId?: string, customHeaders?: CustomHeaders): Promise<unknown> {
        return await this.deviceOps.getSitesSwitchesEs(switchMac, siteId, customHeaders);
    }

    public async getSitesSwitchesEsGeneralConfig(switchMac: string, siteId?: string, customHeaders?: CustomHeaders): Promise<unknown> {
        return await this.deviceOps.getSitesSwitchesEsGeneralConfig(switchMac, siteId, customHeaders);
    }

    public async listSitesCableTestSwitchesPorts(switchMac: string, siteId?: string, customHeaders?: CustomHeaders): Promise<unknown[]> {
        return await this.deviceOps.listSitesCableTestSwitchesPorts(switchMac, siteId, customHeaders);
    }

    public async listSitesCableTestSwitchesIncrementResults(switchMac: string, siteId?: string, customHeaders?: CustomHeaders): Promise<unknown> {
        return await this.deviceOps.listSitesCableTestSwitchesIncrementResults(switchMac, siteId, customHeaders);
    }

    public async getUpgradeOverviewCritical(customHeaders?: CustomHeaders): Promise<unknown> {
        return await this.deviceOps.getUpgradeOverviewCritical(customHeaders);
    }

    public async getUpgradeOverviewTryBeta(customHeaders?: CustomHeaders): Promise<unknown> {
        return await this.deviceOps.getUpgradeOverviewTryBeta(customHeaders);
    }

    public async listUpgradeFirmwares(page: number, pageSize: number, customHeaders?: CustomHeaders): Promise<unknown> {
        return await this.deviceOps.listUpgradeFirmwares(page, pageSize, customHeaders);
    }

    public async listUpgradeOverviewFirmwares(page: number, pageSize: number, customHeaders?: CustomHeaders, channel = 0): Promise<unknown> {
        return await this.deviceOps.listUpgradeOverviewFirmwares(page, pageSize, customHeaders, channel);
    }

    public async listSitesStacks(siteId?: string, page?: number, pageSize?: number, customHeaders?: CustomHeaders): Promise<unknown> {
        return await this.deviceOps.listSitesStacks(siteId, page, pageSize, customHeaders);
    }

    public async getSitesDeviceWhiteList(siteId?: string, page?: number, pageSize?: number, customHeaders?: CustomHeaders): Promise<unknown> {
        return await this.deviceOps.getSitesDeviceWhiteList(siteId, page, pageSize, customHeaders);
    }

    public async listSitesSettingIotDevices(siteId?: string, page?: number, pageSize?: number, customHeaders?: CustomHeaders): Promise<unknown> {
        return await this.deviceOps.listSitesSettingIotDevices(siteId, page, pageSize, customHeaders);
    }

    // Security operations (extended)
    public async getTopThreats(customHeaders?: CustomHeaders, window?: { startTime?: number; endTime?: number }): Promise<unknown> {
        return await this.securityOps.getTopThreats(customHeaders, window);
    }

    public async getThreatSeverity(startTime: number, endTime: number, customHeaders?: CustomHeaders): Promise<unknown> {
        return await this.securityOps.getThreatSeverity(startTime, endTime, customHeaders);
    }

    // Global Controller settings (issue #41)
    public async getControllerStatus(customHeaders?: CustomHeaders): Promise<unknown> {
        return await this.securityOps.getControllerStatus(customHeaders);
    }

    public async getGeneralSettings(customHeaders?: CustomHeaders): Promise<unknown> {
        return await this.securityOps.getGeneralSettings(customHeaders);
    }

    public async getRetention(customHeaders?: CustomHeaders): Promise<unknown> {
        return await this.securityOps.getRetention(customHeaders);
    }

    public async getClientActiveTimeout(customHeaders?: CustomHeaders): Promise<unknown> {
        return await this.securityOps.getClientActiveTimeout(customHeaders);
    }

    public async getRemoteLogging(customHeaders?: CustomHeaders): Promise<unknown> {
        return await this.securityOps.getRemoteLogging(customHeaders);
    }

    public async getRadiusServer(customHeaders?: CustomHeaders): Promise<unknown> {
        return await this.securityOps.getRadiusServer(customHeaders);
    }

    public async getLogging(customHeaders?: CustomHeaders): Promise<unknown> {
        return await this.securityOps.getLogging(customHeaders);
    }

    public async getUiInterface(customHeaders?: CustomHeaders): Promise<unknown> {
        return await this.securityOps.getUiInterface(customHeaders);
    }

    public async getDeviceAccessManagement(customHeaders?: CustomHeaders): Promise<unknown> {
        return await this.securityOps.getDeviceAccessManagement(customHeaders);
    }

    public async getWebhookForGlobal(customHeaders?: CustomHeaders): Promise<unknown> {
        return await this.securityOps.getWebhookForGlobal(customHeaders);
    }

    public async getWebhookLogsForGlobal(
        page: number,
        pageSize: number,
        webhookId: string,
        timeStart: number,
        timeEnd: number,
        customHeaders?: CustomHeaders
    ): Promise<unknown> {
        return await this.securityOps.getWebhookLogsForGlobal(page, pageSize, webhookId, timeStart, timeEnd, customHeaders);
    }

    public async getMailServerStatus(customHeaders?: CustomHeaders): Promise<unknown> {
        return await this.securityOps.getMailServerStatus(customHeaders);
    }

    // Network operations (extended)
    public async getVpnSettings(siteId?: string, customHeaders?: CustomHeaders): Promise<unknown> {
        return await this.networkOps.getVpnSettings(siteId, customHeaders);
    }

    public async listSiteToSiteVpns(siteId?: string, customHeaders?: CustomHeaders): Promise<unknown[]> {
        return await this.networkOps.listSiteToSiteVpns(siteId, customHeaders);
    }

    public async listClientToSiteVpnServers(siteId?: string, customHeaders?: CustomHeaders): Promise<unknown[]> {
        return await this.networkOps.listClientToSiteVpnServers(siteId, customHeaders);
    }

    // VPN tools (issue #39)
    public async getSiteToSiteVpnInfo(vpnId: string, siteId?: string, customHeaders?: CustomHeaders): Promise<unknown> {
        return await this.networkOps.getSiteToSiteVpnInfo(vpnId, siteId, customHeaders);
    }

    public async listWireguard(page: number, pageSize: number, searchKey?: string, siteId?: string, customHeaders?: CustomHeaders): Promise<unknown> {
        return await this.networkOps.listWireguard(page, pageSize, searchKey, siteId, customHeaders);
    }

    public async listWireguardPeers(page: number, pageSize: number, siteId?: string, customHeaders?: CustomHeaders): Promise<unknown> {
        return await this.networkOps.listWireguardPeers(page, pageSize, siteId, customHeaders);
    }

    public async getWireguardSummary(siteId?: string, customHeaders?: CustomHeaders): Promise<unknown> {
        return await this.networkOps.getWireguardSummary(siteId, customHeaders);
    }

    public async listClientToSiteVpnClients(siteId?: string, customHeaders?: CustomHeaders): Promise<unknown> {
        return await this.networkOps.listClientToSiteVpnClients(siteId, customHeaders);
    }

    public async getClientToSiteVpnServerInfo(vpnId: string, siteId?: string, customHeaders?: CustomHeaders): Promise<unknown> {
        return await this.networkOps.getClientToSiteVpnServerInfo(vpnId, siteId, customHeaders);
    }

    public async getSslVpnServerSetting(siteId?: string, customHeaders?: CustomHeaders): Promise<unknown> {
        return await this.networkOps.getSslVpnServerSetting(siteId, customHeaders);
    }

    public async getGridIpsecFailover(page: number, pageSize: number, siteId?: string, customHeaders?: CustomHeaders): Promise<unknown> {
        return await this.networkOps.getGridIpsecFailover(page, pageSize, siteId, customHeaders);
    }

    // Profiles & Policies tools (issue #40)
    public async listServiceType(page: number, pageSize: number, siteId?: string, customHeaders?: CustomHeaders): Promise<unknown> {
        return await this.networkOps.listServiceType(page, pageSize, siteId, customHeaders);
    }

    public async getServiceTypeSummary(siteId?: string, customHeaders?: CustomHeaders): Promise<unknown> {
        return await this.networkOps.getServiceTypeSummary(siteId, customHeaders);
    }

    public async getGroupProfilesByType(groupType: string, siteId?: string, customHeaders?: CustomHeaders): Promise<unknown> {
        return await this.networkOps.getGroupProfilesByType(groupType, siteId, customHeaders);
    }

    public async getLdapProfileList(siteId?: string, customHeaders?: CustomHeaders): Promise<unknown> {
        return await this.networkOps.getLdapProfileList(siteId, customHeaders);
    }

    public async getRadiusUserList(
        page: number,
        pageSize: number,
        sortUsername?: string,
        siteId?: string,
        customHeaders?: CustomHeaders
    ): Promise<unknown> {
        return await this.networkOps.getRadiusUserList(page, pageSize, sortUsername, siteId, customHeaders);
    }

    public async getPPSKProfiles(type: number, siteId?: string, customHeaders?: CustomHeaders): Promise<unknown> {
        return await this.networkOps.getPPSKProfiles(type, siteId, customHeaders);
    }

    public async listMdnsProfile(siteId?: string, customHeaders?: CustomHeaders): Promise<unknown> {
        return await this.networkOps.listMdnsProfile(siteId, customHeaders);
    }

    // --- network-wan (#74) ---

    public async getIspBandScan(portUuid: string, siteId?: string, customHeaders?: CustomHeaders): Promise<unknown> {
        return await this.networkOps.getIspBandScan(portUuid, siteId, customHeaders);
    }

    public async getDisableNatList(page = 1, pageSize = 10, siteId?: string, customHeaders?: CustomHeaders): Promise<unknown> {
        return await this.networkOps.getDisableNatList(page, pageSize, siteId, customHeaders);
    }

    public async getLtePortConfig(siteId?: string, customHeaders?: CustomHeaders): Promise<unknown> {
        return await this.networkOps.getLtePortConfig(siteId, customHeaders);
    }

    public async getWanPortDetail(siteId?: string, customHeaders?: CustomHeaders): Promise<unknown> {
        return await this.networkOps.getWanPortDetail(siteId, customHeaders);
    }

    public async getWanIspProfile(portUuid: string, siteId?: string, customHeaders?: CustomHeaders): Promise<unknown> {
        return await this.networkOps.getWanIspProfile(portUuid, siteId, customHeaders);
    }

    public async getWanQosConfig(siteId?: string, customHeaders?: CustomHeaders): Promise<unknown> {
        return await this.networkOps.getWanQosConfig(siteId, customHeaders);
    }

    public async getWanHealthDetail(gatewayMac: string, siteId?: string, customHeaders?: CustomHeaders): Promise<unknown> {
        return await this.getSitesHealthGatewaysWansDetails(gatewayMac, siteId, customHeaders);
    }

    public async getWanUsageStats(siteId?: string, customHeaders?: CustomHeaders): Promise<unknown> {
        return await this.networkOps.getWanUsageStats(siteId, customHeaders);
    }

    public async getWanNatConfig(page = 1, pageSize = 10, siteId?: string, customHeaders?: CustomHeaders): Promise<unknown> {
        return await this.networkOps.getWanNatConfig(page, pageSize, siteId, customHeaders);
    }

    // --- network-lan (#74) ---

    public async getSwitchVlanInterface(switchMac: string, siteId?: string, customHeaders?: CustomHeaders): Promise<unknown> {
        return await this.networkOps.getSwitchVlanInterface(switchMac, siteId, customHeaders);
    }

    public async getLanDnsRules(page = 1, pageSize = 10, siteId?: string, customHeaders?: CustomHeaders): Promise<unknown> {
        return await this.networkOps.getLanDnsRules(page, pageSize, siteId, customHeaders);
    }

    public async getLanProfileEsUsage(profileId: string, siteId?: string, customHeaders?: CustomHeaders): Promise<unknown[]> {
        return await this.networkOps.getLanProfileEsUsage(profileId, siteId, customHeaders);
    }

    public async getLanClientCount(siteId?: string, customHeaders?: CustomHeaders): Promise<unknown> {
        return await this.networkOps.getLanClientCount(siteId, customHeaders);
    }

    // --- network-routing (#74) ---

    public async getOspfProcess(siteId?: string, customHeaders?: CustomHeaders): Promise<unknown[]> {
        return await this.networkOps.getOspfProcess(siteId, customHeaders);
    }

    public async getOspfInterface(siteId?: string, customHeaders?: CustomHeaders): Promise<unknown[]> {
        return await this.networkOps.getOspfInterface(siteId, customHeaders);
    }

    public async getVrrpConfig(siteId?: string, customHeaders?: CustomHeaders): Promise<unknown[]> {
        return await this.networkOps.getVrrpConfig(siteId, customHeaders);
    }

    public async getOspfNeighbors(siteId?: string, customHeaders?: CustomHeaders): Promise<unknown> {
        return await this.networkOps.getOspfNeighbors(siteId, customHeaders);
    }

    // --- network-services (#74) ---

    public async getDnsCacheDataList(page = 1, pageSize = 10, siteId?: string, customHeaders?: CustomHeaders): Promise<unknown> {
        return await this.networkOps.getDnsCacheDataList(page, pageSize, siteId, customHeaders);
    }

    public async getIptvSetting(siteId?: string, customHeaders?: CustomHeaders): Promise<unknown> {
        return await this.networkOps.getIptvSetting(siteId, customHeaders);
    }

    public async getNtpSetting(siteId?: string, customHeaders?: CustomHeaders): Promise<unknown> {
        return await this.networkOps.getNtpSetting(siteId, customHeaders);
    }

    public async listPortForwardingRules(siteId?: string, customHeaders?: CustomHeaders): Promise<unknown[]> {
        return await this.networkOps.listPortForwardingRules(siteId, customHeaders);
    }

    public async getPortForwardingListPage(page: number, pageSize: number, siteId?: string, customHeaders?: CustomHeaders): Promise<unknown> {
        return await this.networkOps.getPortForwardingListPage(page, pageSize, siteId, customHeaders);
    }

    public async listOneToOneNatRules(siteId?: string, customHeaders?: CustomHeaders): Promise<unknown[]> {
        return await this.networkOps.listOneToOneNatRules(siteId, customHeaders);
    }

    public async listOsgAcls(siteId?: string, customHeaders?: CustomHeaders): Promise<unknown[]> {
        return await this.networkOps.listOsgAcls(siteId, customHeaders);
    }

    public async listEapAcls(siteId?: string, customHeaders?: CustomHeaders): Promise<unknown[]> {
        return await this.networkOps.listEapAcls(siteId, customHeaders);
    }

    public async listOswAcls(siteId?: string, customHeaders?: CustomHeaders): Promise<unknown[]> {
        return await this.networkOps.listOswAcls(siteId, customHeaders);
    }

    public async listStaticRoutes(siteId?: string, customHeaders?: CustomHeaders): Promise<unknown[]> {
        return await this.networkOps.listStaticRoutes(siteId, customHeaders);
    }

    public async listPolicyRoutes(siteId?: string, customHeaders?: CustomHeaders): Promise<unknown[]> {
        return await this.networkOps.listPolicyRoutes(siteId, customHeaders);
    }

    public async listRadiusProfiles(siteId?: string, customHeaders?: CustomHeaders): Promise<unknown[]> {
        return await this.networkOps.listRadiusProfiles(siteId, customHeaders);
    }

    public async listGroupProfiles(groupType?: string, siteId?: string, customHeaders?: CustomHeaders): Promise<unknown[]> {
        return await this.networkOps.listGroupProfiles(groupType, siteId, customHeaders);
    }

    public async getApplicationControlStatus(siteId?: string, customHeaders?: CustomHeaders): Promise<unknown> {
        return await this.networkOps.getApplicationControlStatus(siteId, customHeaders);
    }

    public async getBandwidthControl(siteId?: string, customHeaders?: CustomHeaders): Promise<unknown> {
        return await this.networkOps.getBandwidthControl(siteId, customHeaders);
    }

    public async getSshSetting(siteId?: string, customHeaders?: CustomHeaders): Promise<unknown> {
        return await this.networkOps.getSshSetting(siteId, customHeaders);
    }

    public async getLedSetting(siteId?: string, customHeaders?: CustomHeaders): Promise<unknown> {
        return await this.networkOps.getLedSetting(siteId, customHeaders);
    }

    public async listTimeRangeProfiles(siteId?: string, customHeaders?: CustomHeaders): Promise<unknown[]> {
        return await this.networkOps.listTimeRangeProfiles(siteId, customHeaders);
    }

    public async listPortSchedules(siteId?: string, customHeaders?: CustomHeaders): Promise<unknown[]> {
        return await this.networkOps.listPortSchedules(siteId, customHeaders);
    }

    public async listPoeSchedules(siteId?: string, customHeaders?: CustomHeaders): Promise<unknown[]> {
        return await this.networkOps.listPoeSchedules(siteId, customHeaders);
    }

    public async getGatewayUrlFilters(siteId?: string, customHeaders?: CustomHeaders): Promise<unknown> {
        return await this.networkOps.getGatewayUrlFilters(siteId, customHeaders);
    }

    public async getEapUrlFilters(siteId?: string, customHeaders?: CustomHeaders): Promise<unknown> {
        return await this.networkOps.getEapUrlFilters(siteId, customHeaders);
    }

    public async listAllSsids(siteId?: string, customHeaders?: CustomHeaders): Promise<unknown[]> {
        return await this.networkOps.listAllSsids(siteId, customHeaders);
    }

    public async getWanLanStatus(siteId?: string, customHeaders?: CustomHeaders): Promise<unknown> {
        return await this.networkOps.getWanLanStatus(siteId, customHeaders);
    }

    public async listBandwidthControlRules(siteId?: string, customHeaders?: CustomHeaders): Promise<unknown[]> {
        return await this.networkOps.listBandwidthControlRules(siteId, customHeaders);
    }

    // LAN/Network config tools (issue #38)
    public async getLanNetworkListV2(page: number, pageSize: number, siteId?: string, customHeaders?: CustomHeaders): Promise<unknown> {
        return await this.networkOps.getLanNetworkListV2(page, pageSize, siteId, customHeaders);
    }
    public async getInterfaceLanNetwork(type?: number, siteId?: string, customHeaders?: CustomHeaders): Promise<unknown> {
        return await this.networkOps.getInterfaceLanNetwork(type, siteId, customHeaders);
    }
    public async getInterfaceLanNetworkV2(type?: number, siteId?: string, customHeaders?: CustomHeaders): Promise<unknown> {
        return await this.networkOps.getInterfaceLanNetworkV2(type, siteId, customHeaders);
    }
    public async getGridPolicyRouting(page: number, pageSize: number, siteId?: string, customHeaders?: CustomHeaders): Promise<unknown> {
        return await this.networkOps.getGridPolicyRouting(page, pageSize, siteId, customHeaders);
    }
    public async getGridStaticRouting(page: number, pageSize: number, siteId?: string, customHeaders?: CustomHeaders): Promise<unknown> {
        return await this.networkOps.getGridStaticRouting(page, pageSize, siteId, customHeaders);
    }
    public async getStaticRoutingInterfaceList(siteId?: string, customHeaders?: CustomHeaders): Promise<unknown> {
        return await this.networkOps.getStaticRoutingInterfaceList(siteId, customHeaders);
    }
    public async getGridOtoNats(page: number, pageSize: number, siteId?: string, customHeaders?: CustomHeaders): Promise<unknown> {
        return await this.networkOps.getGridOtoNats(page, pageSize, siteId, customHeaders);
    }
    public async getAlg(siteId?: string, customHeaders?: CustomHeaders): Promise<unknown> {
        return await this.networkOps.getAlg(siteId, customHeaders);
    }
    public async getUpnpSetting(siteId?: string, customHeaders?: CustomHeaders): Promise<unknown> {
        return await this.networkOps.getUpnpSetting(siteId, customHeaders);
    }
    public async getDdnsGrid(page: number, pageSize: number, siteId?: string, customHeaders?: CustomHeaders): Promise<unknown> {
        return await this.networkOps.getDdnsGrid(page, pageSize, siteId, customHeaders);
    }
    public async getDhcpReservationGrid(page: number, pageSize: number, siteId?: string, customHeaders?: CustomHeaders): Promise<unknown> {
        return await this.networkOps.getDhcpReservationGrid(page, pageSize, siteId, customHeaders);
    }
    public async createDhcpReservation(
        payload: {
            netId: string;
            mac: string;
            status: boolean;
            ip?: string;
            description?: string;
            confirmConflict?: boolean;
            options?: unknown[];
        },
        siteId?: string,
        customHeaders?: CustomHeaders
    ): Promise<unknown> {
        return await this.networkOps.createDhcpReservation(payload, siteId, customHeaders);
    }
    public async updateDhcpReservation(
        mac: string,
        payload: {
            netId: string;
            status: boolean;
            ip?: string;
            description?: string;
            confirmConflict?: boolean;
            options?: unknown[];
        },
        siteId?: string,
        customHeaders?: CustomHeaders
    ): Promise<unknown> {
        return await this.networkOps.updateDhcpReservation(mac, payload, siteId, customHeaders);
    }
    public async deleteDhcpReservation(mac: string, siteId?: string, customHeaders?: CustomHeaders): Promise<unknown> {
        return await this.networkOps.deleteDhcpReservation(mac, siteId, customHeaders);
    }
    public async createBandwidthCtrlRule(payload: unknown, siteId?: string, customHeaders?: CustomHeaders): Promise<unknown> {
        return await this.networkOps.createBandwidthCtrlRule(payload, siteId, customHeaders);
    }
    public async updateBandwidthCtrlRule(ruleId: string, payload: unknown, siteId?: string, customHeaders?: CustomHeaders): Promise<unknown> {
        return await this.networkOps.updateBandwidthCtrlRule(ruleId, payload, siteId, customHeaders);
    }
    public async deleteBandwidthCtrlRule(ruleId: string, siteId?: string, customHeaders?: CustomHeaders): Promise<unknown> {
        return await this.networkOps.deleteBandwidthCtrlRule(ruleId, siteId, customHeaders);
    }
    public async setAccessControl(payload: unknown, siteId?: string, customHeaders?: CustomHeaders): Promise<unknown> {
        return await this.networkOps.setAccessControl(payload, siteId, customHeaders);
    }
    public async getGridIpMacBinding(page: number, pageSize: number, siteId?: string, customHeaders?: CustomHeaders): Promise<unknown> {
        return await this.networkOps.getGridIpMacBinding(page, pageSize, siteId, customHeaders);
    }
    public async getIpMacBindingGeneralSetting(siteId?: string, customHeaders?: CustomHeaders): Promise<unknown> {
        return await this.networkOps.getIpMacBindingGeneralSetting(siteId, customHeaders);
    }
    public async getSnmpSetting(siteId?: string, customHeaders?: CustomHeaders): Promise<unknown> {
        return await this.networkOps.getSnmpSetting(siteId, customHeaders);
    }
    public async getLldpSetting(siteId?: string, customHeaders?: CustomHeaders): Promise<unknown> {
        return await this.networkOps.getLldpSetting(siteId, customHeaders);
    }
    public async getRemoteLoggingSetting(siteId?: string, customHeaders?: CustomHeaders): Promise<unknown> {
        return await this.networkOps.getRemoteLoggingSetting(siteId, customHeaders);
    }
    public async getSessionLimit(siteId?: string, customHeaders?: CustomHeaders): Promise<unknown> {
        return await this.networkOps.getSessionLimit(siteId, customHeaders);
    }
    public async getGridSessionLimitRule(page: number, pageSize: number, siteId?: string, customHeaders?: CustomHeaders): Promise<unknown> {
        return await this.networkOps.getGridSessionLimitRule(page, pageSize, siteId, customHeaders);
    }
    public async getGridBandwidthCtrlRule(page: number, pageSize: number, siteId?: string, customHeaders?: CustomHeaders): Promise<unknown> {
        return await this.networkOps.getGridBandwidthCtrlRule(page, pageSize, siteId, customHeaders);
    }
    public async getAccessControl(siteId?: string, customHeaders?: CustomHeaders): Promise<unknown> {
        return await this.networkOps.getAccessControl(siteId, customHeaders);
    }
    public async getDnsCacheSetting(siteId?: string, customHeaders?: CustomHeaders): Promise<unknown> {
        return await this.networkOps.getDnsCacheSetting(siteId, customHeaders);
    }
    public async getDnsProxy(siteId?: string, customHeaders?: CustomHeaders): Promise<unknown> {
        return await this.networkOps.getDnsProxy(siteId, customHeaders);
    }
    public async getIgmp(siteId?: string, customHeaders?: CustomHeaders): Promise<unknown> {
        return await this.networkOps.getIgmp(siteId, customHeaders);
    }
    public async getInternetLoadBalance(siteId?: string, customHeaders?: CustomHeaders): Promise<unknown> {
        return await this.networkOps.getInternetLoadBalance(siteId, customHeaders);
    }
    public async getWanPortsConfig(siteId?: string, customHeaders?: CustomHeaders): Promise<unknown> {
        return await this.networkOps.getWanPortsConfig(siteId, customHeaders);
    }
    public async getInternetBasicPortInfo(siteId?: string, customHeaders?: CustomHeaders): Promise<unknown> {
        return await this.networkOps.getInternetBasicPortInfo(siteId, customHeaders);
    }
    public async getInternet(siteId?: string, customHeaders?: CustomHeaders): Promise<unknown> {
        return await this.networkOps.getInternet(siteId, customHeaders);
    }
    public async getGridVirtualWan(page: number, pageSize: number, siteId?: string, customHeaders?: CustomHeaders): Promise<unknown> {
        return await this.networkOps.getGridVirtualWan(page, pageSize, siteId, customHeaders);
    }

    // Wireless/SSID tools (issue #35)
    public async getSsidsBySite(type: number, siteId?: string, customHeaders?: CustomHeaders): Promise<unknown> {
        return await this.networkOps.getSsidsBySite(type, siteId, customHeaders);
    }

    public async getRadioFrequencyPlanningConfig(siteId?: string, customHeaders?: CustomHeaders): Promise<unknown> {
        return await this.networkOps.getRadioFrequencyPlanningConfig(siteId, customHeaders);
    }

    public async getRadioFrequencyPlanningResult(siteId?: string, customHeaders?: CustomHeaders): Promise<unknown> {
        return await this.networkOps.getRadioFrequencyPlanningResult(siteId, customHeaders);
    }

    public async getBandSteeringSetting(siteId?: string, customHeaders?: CustomHeaders): Promise<unknown> {
        return await this.networkOps.getBandSteeringSetting(siteId, customHeaders);
    }

    public async getBeaconControlSetting(siteId?: string, customHeaders?: CustomHeaders): Promise<unknown> {
        return await this.networkOps.getBeaconControlSetting(siteId, customHeaders);
    }

    public async getChannelLimitSetting(siteId?: string, customHeaders?: CustomHeaders): Promise<unknown> {
        return await this.networkOps.getChannelLimitSetting(siteId, customHeaders);
    }

    public async getMeshSetting(siteId?: string, customHeaders?: CustomHeaders): Promise<unknown> {
        return await this.networkOps.getMeshSetting(siteId, customHeaders);
    }

    public async getRoamingSetting(siteId?: string, customHeaders?: CustomHeaders): Promise<unknown> {
        return await this.networkOps.getRoamingSetting(siteId, customHeaders);
    }

    public async getOuiProfileList(page: number, pageSize: number, siteId?: string, customHeaders?: CustomHeaders): Promise<unknown> {
        return await this.networkOps.getOuiProfileList(page, pageSize, siteId, customHeaders);
    }

    public async getMacAuthSetting(siteId?: string, customHeaders?: CustomHeaders): Promise<unknown> {
        return await this.networkOps.getMacAuthSetting(siteId, customHeaders);
    }

    public async getMacAuthSsids(siteId?: string, customHeaders?: CustomHeaders): Promise<unknown> {
        return await this.networkOps.getMacAuthSsids(siteId, customHeaders);
    }

    public async getMacFilteringGeneralSetting(siteId?: string, customHeaders?: CustomHeaders): Promise<unknown> {
        return await this.networkOps.getMacFilteringGeneralSetting(siteId, customHeaders);
    }

    public async getGridAllowMacFiltering(page: number, pageSize: number, siteId?: string, customHeaders?: CustomHeaders): Promise<unknown> {
        return await this.networkOps.getGridAllowMacFiltering(page, pageSize, siteId, customHeaders);
    }

    public async getGridDenyMacFiltering(page: number, pageSize: number, siteId?: string, customHeaders?: CustomHeaders): Promise<unknown> {
        return await this.networkOps.getGridDenyMacFiltering(page, pageSize, siteId, customHeaders);
    }

    public async getSwitchDot1xSetting(siteId?: string, customHeaders?: CustomHeaders): Promise<unknown> {
        return await this.networkOps.getSwitchDot1xSetting(siteId, customHeaders);
    }

    public async getEapDot1xSetting(siteId?: string, customHeaders?: CustomHeaders): Promise<unknown> {
        return await this.networkOps.getEapDot1xSetting(siteId, customHeaders);
    }

    // Firewall / ACL / IPS / URL-filter tools (issue #37)
    public async getAclConfigTypeSetting(siteId?: string, customHeaders?: CustomHeaders): Promise<unknown> {
        return await this.networkOps.getAclConfigTypeSetting(siteId, customHeaders);
    }

    public async setAclConfigTypeSetting(payload: unknown, siteId?: string, customHeaders?: CustomHeaders): Promise<unknown> {
        return await this.networkOps.setAclConfigTypeSetting(payload, siteId, customHeaders);
    }

    public async createOsgAcl(payload: unknown, siteId?: string, customHeaders?: CustomHeaders): Promise<unknown> {
        return await this.networkOps.createOsgAcl(payload, siteId, customHeaders);
    }

    public async updateOsgAcl(aclId: string, payload: unknown, siteId?: string, customHeaders?: CustomHeaders): Promise<unknown> {
        return await this.networkOps.updateOsgAcl(aclId, payload, siteId, customHeaders);
    }

    public async createEapAcl(payload: unknown, siteId?: string, customHeaders?: CustomHeaders): Promise<unknown> {
        return await this.networkOps.createEapAcl(payload, siteId, customHeaders);
    }

    public async updateEapAcl(aclId: string, payload: unknown, siteId?: string, customHeaders?: CustomHeaders): Promise<unknown> {
        return await this.networkOps.updateEapAcl(aclId, payload, siteId, customHeaders);
    }

    public async createOswAcl(payload: unknown, siteId?: string, customHeaders?: CustomHeaders): Promise<unknown> {
        return await this.networkOps.createOswAcl(payload, siteId, customHeaders);
    }

    public async updateOswAcl(aclId: string, payload: unknown, siteId?: string, customHeaders?: CustomHeaders): Promise<unknown> {
        return await this.networkOps.updateOswAcl(aclId, payload, siteId, customHeaders);
    }

    public async deleteAcl(aclId: string, siteId?: string, customHeaders?: CustomHeaders): Promise<unknown> {
        return await this.networkOps.deleteAcl(aclId, siteId, customHeaders);
    }

    public async getOsgCustomAclList(page: number, pageSize: number, siteId?: string, customHeaders?: CustomHeaders): Promise<unknown> {
        return await this.networkOps.getOsgCustomAclList(page, pageSize, siteId, customHeaders);
    }

    public async getOswAclList(page: number, pageSize: number, siteId?: string, customHeaders?: CustomHeaders): Promise<unknown> {
        return await this.networkOps.getOswAclList(page, pageSize, siteId, customHeaders);
    }

    public async getIpsConfig(siteId?: string, customHeaders?: CustomHeaders): Promise<unknown> {
        return await this.networkOps.getIpsConfig(siteId, customHeaders);
    }

    public async getGridSignature(page: number, pageSize: number, siteId?: string, customHeaders?: CustomHeaders): Promise<unknown> {
        return await this.networkOps.getGridSignature(page, pageSize, siteId, customHeaders);
    }

    public async getGridAllowList(
        page: number,
        pageSize: number,
        searchKey?: string,
        siteId?: string,
        customHeaders?: CustomHeaders
    ): Promise<unknown> {
        return await this.networkOps.getGridAllowList(page, pageSize, searchKey, siteId, customHeaders);
    }

    public async getGridBlockList(
        page: number,
        pageSize: number,
        searchKey?: string,
        siteId?: string,
        customHeaders?: CustomHeaders
    ): Promise<unknown> {
        return await this.networkOps.getGridBlockList(page, pageSize, searchKey, siteId, customHeaders);
    }

    public async getAttackDefenseSetting(siteId?: string, customHeaders?: CustomHeaders): Promise<unknown> {
        return await this.networkOps.getAttackDefenseSetting(siteId, customHeaders);
    }

    public async getUrlFilterGeneral(siteId?: string, customHeaders?: CustomHeaders): Promise<unknown> {
        return await this.networkOps.getUrlFilterGeneral(siteId, customHeaders);
    }

    public async getGridGatewayRule(page: number, pageSize: number, siteId?: string, customHeaders?: CustomHeaders): Promise<unknown> {
        return await this.networkOps.getGridGatewayRule(page, pageSize, siteId, customHeaders);
    }

    public async getGridEapRule(page: number, pageSize: number, siteId?: string, customHeaders?: CustomHeaders): Promise<unknown> {
        return await this.networkOps.getGridEapRule(page, pageSize, siteId, customHeaders);
    }

    // Monitor / dashboard operations
    public async getDashboardWifiSummary(siteId?: string, customHeaders?: CustomHeaders, window?: DashboardWindow): Promise<unknown> {
        return await this.monitorOps.getDashboardWifiSummary(siteId, customHeaders, window);
    }

    public async getDashboardSwitchSummary(siteId?: string, customHeaders?: CustomHeaders, window?: DashboardWindow): Promise<unknown> {
        return await this.monitorOps.getDashboardSwitchSummary(siteId, customHeaders, window);
    }

    public async getTrafficDistribution(siteId?: string, start?: number, end?: number, customHeaders?: CustomHeaders): Promise<unknown> {
        return await this.monitorOps.getTrafficDistribution(siteId, start, end, customHeaders);
    }

    public async getRetryAndDroppedRate(siteId?: string, start?: number, end?: number, customHeaders?: CustomHeaders): Promise<unknown> {
        return await this.monitorOps.getRetryAndDroppedRate(siteId, start, end, customHeaders);
    }

    public async getDashboardTrafficActivities(siteId?: string, customHeaders?: CustomHeaders, window?: DashboardWindow): Promise<unknown> {
        return await this.monitorOps.getDashboardTrafficActivities(siteId, customHeaders, window);
    }

    public async getDashboardPoEUsage(siteId?: string, customHeaders?: CustomHeaders): Promise<unknown> {
        return await this.monitorOps.getDashboardPoEUsage(siteId, customHeaders);
    }

    public async getDashboardTopCpuUsage(siteId?: string, customHeaders?: CustomHeaders, window?: DashboardWindow): Promise<unknown[]> {
        return await this.monitorOps.getDashboardTopCpuUsage(siteId, customHeaders, window);
    }

    public async getDashboardTopMemoryUsage(siteId?: string, customHeaders?: CustomHeaders, window?: DashboardWindow): Promise<unknown[]> {
        return await this.monitorOps.getDashboardTopMemoryUsage(siteId, customHeaders, window);
    }

    public async getDashboardMostActiveSwitches(siteId?: string, customHeaders?: CustomHeaders, window?: DashboardWindow): Promise<unknown[]> {
        return await this.monitorOps.getDashboardMostActiveSwitches(siteId, customHeaders, window);
    }

    public async getDashboardMostActiveEaps(siteId?: string, customHeaders?: CustomHeaders, window?: DashboardWindow): Promise<unknown[]> {
        return await this.monitorOps.getDashboardMostActiveEaps(siteId, customHeaders, window);
    }

    public async getDashboardOverview(siteId?: string, customHeaders?: CustomHeaders): Promise<unknown> {
        return await this.monitorOps.getDashboardOverview(siteId, customHeaders);
    }

    public async getChannels(siteId?: string, customHeaders?: CustomHeaders): Promise<unknown> {
        return await this.monitorOps.getChannels(siteId, customHeaders);
    }

    public async getIspLoad(siteId?: string, start?: number, end?: number, customHeaders?: CustomHeaders): Promise<unknown> {
        return await this.monitorOps.getIspLoad(siteId, start, end, customHeaders);
    }

    public async getInterference(siteId?: string, customHeaders?: CustomHeaders): Promise<unknown> {
        return await this.monitorOps.getInterference(siteId, customHeaders);
    }

    public async getGridDashboardTunnelStats(siteId?: string, type?: number, customHeaders?: CustomHeaders): Promise<unknown> {
        return await this.monitorOps.getGridDashboardTunnelStats(siteId, type, customHeaders);
    }

    public async getGridDashboardIpsecTunnelStats(siteId?: string, customHeaders?: CustomHeaders): Promise<unknown> {
        return await this.monitorOps.getGridDashboardIpsecTunnelStats(siteId, customHeaders);
    }

    public async getGridDashboardOpenVpnTunnelStats(siteId?: string, type?: number, customHeaders?: CustomHeaders): Promise<unknown> {
        return await this.monitorOps.getGridDashboardOpenVpnTunnelStats(siteId, type, customHeaders);
    }

    // Insight operations
    public async listSiteThreatManagement(
        options: SiteThreatListOptions,
        siteId?: string,
        customHeaders?: CustomHeaders
    ): Promise<PaginatedResult<unknown>> {
        return await this.insightOps.listSiteThreatManagement(options, siteId, customHeaders);
    }

    public async getWids(siteId?: string, customHeaders?: CustomHeaders): Promise<unknown> {
        return await this.insightOps.getWids(siteId, customHeaders);
    }

    public async getWidsBlacklist(siteId?: string, customHeaders?: CustomHeaders): Promise<unknown[]> {
        return await this.insightOps.getWidsBlacklist(siteId, customHeaders);
    }

    public async getRogueAps(siteId?: string, customHeaders?: CustomHeaders): Promise<unknown[]> {
        return await this.insightOps.getRogueAps(siteId, customHeaders);
    }

    public async getVpnTunnelStats(page: number, pageSize: number, siteId?: string, customHeaders?: CustomHeaders): Promise<unknown> {
        return await this.insightOps.getVpnTunnelStats(page, pageSize, siteId, customHeaders);
    }

    public async getIpsecVpnStats(page: number, pageSize: number, siteId?: string, customHeaders?: CustomHeaders): Promise<unknown> {
        return await this.insightOps.getIpsecVpnStats(page, pageSize, siteId, customHeaders);
    }

    public async listInsightClients(
        page: number,
        pageSize: number,
        siteId?: string,
        customHeaders?: CustomHeaders
    ): Promise<PaginatedResult<unknown>> {
        return await this.insightOps.listInsightClients(page, pageSize, siteId, customHeaders);
    }

    public async getRoutingTable(type: string, siteId?: string, customHeaders?: CustomHeaders): Promise<unknown[]> {
        return await this.insightOps.getRoutingTable(type, siteId, customHeaders);
    }

    public async getThreatDetail(threatId: string, time?: number, siteId?: string, customHeaders?: CustomHeaders): Promise<unknown> {
        return await this.insightOps.getThreatDetail(threatId, time, siteId, customHeaders);
    }

    // Log operations
    public async listSiteEvents(options: LogQueryOptions, siteId?: string, customHeaders?: CustomHeaders): Promise<PaginatedResult<unknown>> {
        return await this.logOps.listSiteEvents(options, siteId, customHeaders);
    }

    public async listSiteAlerts(options: LogQueryOptions, siteId?: string, customHeaders?: CustomHeaders): Promise<PaginatedResult<unknown>> {
        return await this.logOps.listSiteAlerts(options, siteId, customHeaders);
    }

    public async listSiteAuditLogs(options: LogQueryOptions, siteId?: string, customHeaders?: CustomHeaders): Promise<PaginatedResult<unknown>> {
        return await this.logOps.listSiteAuditLogs(options, siteId, customHeaders);
    }

    public async listGlobalEvents(options: LogQueryOptions, customHeaders?: CustomHeaders): Promise<PaginatedResult<unknown>> {
        return await this.logOps.listGlobalEvents(options, customHeaders);
    }

    public async listGlobalAlerts(options: LogQueryOptions, customHeaders?: CustomHeaders): Promise<PaginatedResult<unknown>> {
        return await this.logOps.listGlobalAlerts(options, customHeaders);
    }

    public async listGlobalAuditLogs(options: LogQueryOptions, customHeaders?: CustomHeaders): Promise<PaginatedResult<unknown>> {
        return await this.logOps.listGlobalAuditLogs(options, customHeaders);
    }

    // Logs, Events & Alerts tools (issue #42)
    public async getLogSettingForSite(siteId?: string, customHeaders?: CustomHeaders): Promise<unknown> {
        return await this.logOps.getLogSettingForSite(siteId, customHeaders);
    }

    public async getLogSettingForSiteV2(siteId?: string, customHeaders?: CustomHeaders): Promise<unknown> {
        return await this.logOps.getLogSettingForSiteV2(siteId, customHeaders);
    }

    public async getAuditLogSettingForSite(siteId?: string, customHeaders?: CustomHeaders): Promise<unknown> {
        return await this.logOps.getAuditLogSettingForSite(siteId, customHeaders);
    }

    public async getLogSettingForGlobal(customHeaders?: CustomHeaders): Promise<unknown> {
        return await this.logOps.getLogSettingForGlobal(customHeaders);
    }

    public async getLogSettingForGlobalV2(customHeaders?: CustomHeaders): Promise<unknown> {
        return await this.logOps.getLogSettingForGlobalV2(customHeaders);
    }

    public async getAuditLogSettingForGlobal(customHeaders?: CustomHeaders): Promise<unknown> {
        return await this.logOps.getAuditLogSettingForGlobal(customHeaders);
    }

    public async getAuditLogsForGlobal(
        page: number,
        pageSize: number,
        options?: {
            sortTime?: string;
            filterResult?: number;
            filterLevel?: string;
            filterAuditTypes?: string;
            filterTimes?: string;
            searchKey?: string;
        },
        customHeaders?: CustomHeaders
    ): Promise<unknown> {
        return await this.logOps.getAuditLogsForGlobal(page, pageSize, options, customHeaders);
    }

    // security-vpn additions (#75)
    public async getRadiusProxyConfig(customHeaders?: CustomHeaders): Promise<unknown> {
        return await this.networkOps.getRadiusProxyConfig(customHeaders);
    }

    public async getGatewayQosClassRules(page = 1, pageSize = 10, siteId?: string, customHeaders?: CustomHeaders): Promise<unknown> {
        return await this.networkOps.getGatewayQosClassRules(page, pageSize, siteId, customHeaders);
    }

    public async getBandwidthCtrlDetail(siteId?: string, customHeaders?: CustomHeaders): Promise<unknown> {
        return await this.networkOps.getBandwidthCtrlDetail(siteId, customHeaders);
    }

    public async getAppControlRules(page = 1, pageSize = 10, siteId?: string, customHeaders?: CustomHeaders): Promise<unknown> {
        return await this.networkOps.getAppControlRules(page, pageSize, siteId, customHeaders);
    }
    public async createAppControlRule(payload: unknown, siteId?: string, customHeaders?: CustomHeaders): Promise<unknown> {
        return await this.networkOps.createAppControlRule(payload, siteId, customHeaders);
    }
    public async updateAppControlRule(ruleId: string, payload: unknown, siteId?: string, customHeaders?: CustomHeaders): Promise<unknown> {
        return await this.networkOps.updateAppControlRule(ruleId, payload, siteId, customHeaders);
    }
    public async deleteAppControlRule(ruleId: string, siteId?: string, customHeaders?: CustomHeaders): Promise<unknown> {
        return await this.networkOps.deleteAppControlRule(ruleId, siteId, customHeaders);
    }

    public async getAppControlCategories(siteId?: string, customHeaders?: CustomHeaders): Promise<unknown> {
        return await this.networkOps.getAppControlCategories(siteId, customHeaders);
    }

    public async getApplications(
        page = 1,
        pageSize = 10,
        searchKey?: string,
        filtersFamilyId?: number,
        siteId?: string,
        customHeaders?: CustomHeaders
    ): Promise<unknown> {
        return await this.networkOps.getApplications(page, pageSize, searchKey, filtersFamilyId, siteId, customHeaders);
    }

    public async getQosPolicy(siteId?: string, customHeaders?: CustomHeaders): Promise<unknown> {
        return await this.networkOps.getQosPolicy(siteId, customHeaders);
    }

    public async getTrafficPriority(siteId?: string, customHeaders?: CustomHeaders): Promise<unknown> {
        return await this.networkOps.getTrafficPriority(siteId, customHeaders);
    }

    public async getVpnUserList(page = 1, pageSize = 10, siteId?: string, customHeaders?: CustomHeaders): Promise<unknown> {
        return await this.networkOps.getVpnUserList(page, pageSize, siteId, customHeaders);
    }

    public async getVpnUserDetail(vpnId: string, siteId?: string, customHeaders?: CustomHeaders): Promise<unknown> {
        return await this.networkOps.getVpnUserDetail(vpnId, siteId, customHeaders);
    }

    public async getGoogleLdapProfile(siteId?: string, customHeaders?: CustomHeaders): Promise<unknown> {
        return await this.networkOps.getGoogleLdapProfile(siteId, customHeaders);
    }

    public async getPpskUserGroup(profileId: string, siteId?: string, customHeaders?: CustomHeaders): Promise<unknown> {
        return await this.networkOps.getPpskUserGroup(profileId, siteId, customHeaders);
    }

    public async getUserRoleProfile(customHeaders?: CustomHeaders): Promise<unknown> {
        return await this.networkOps.getUserRoleProfile(customHeaders);
    }

    public async getPortalProfile(siteId?: string, customHeaders?: CustomHeaders): Promise<unknown> {
        return await this.networkOps.getPortalProfile(siteId, customHeaders);
    }

    public async getMulticastRateLimit(siteId?: string, customHeaders?: CustomHeaders): Promise<unknown> {
        return await this.networkOps.getMulticastRateLimit(siteId, customHeaders);
    }

    // Device — new AP tools (route through DeviceOperations wrappers for naming consistency)
    public async getApLoadBalance(apMac: string, siteId?: string, customHeaders?: CustomHeaders): Promise<unknown> {
        return await this.deviceOps.getApLoadBalance(apMac, siteId, customHeaders);
    }

    public async getApOfdmaConfig(apMac: string, siteId?: string, customHeaders?: CustomHeaders): Promise<unknown> {
        return await this.deviceOps.getApOfdmaConfig(apMac, siteId, customHeaders);
    }

    // Site detail and template operations
    public async getSiteDetail(siteId?: string, customHeaders?: CustomHeaders): Promise<unknown> {
        return await this.siteOps.getSiteDetail(siteId, customHeaders);
    }

    public async getSiteUrl(siteId?: string, customHeaders?: CustomHeaders): Promise<unknown> {
        return await this.siteOps.getSiteUrl(siteId, customHeaders);
    }

    public async getSiteNtpStatus(siteId?: string, customHeaders?: CustomHeaders): Promise<unknown> {
        return await this.siteOps.getSiteNtpStatus(siteId, customHeaders);
    }

    public async getSiteSpecification(siteId?: string, customHeaders?: CustomHeaders): Promise<unknown> {
        return await this.siteOps.getSiteSpecification(siteId, customHeaders);
    }

    public async getSiteRememberSetting(siteId?: string, customHeaders?: CustomHeaders): Promise<unknown> {
        return await this.siteOps.getSiteRememberSetting(siteId, customHeaders);
    }

    public async getSiteDeviceAccount(siteId?: string, customHeaders?: CustomHeaders): Promise<unknown> {
        return await this.siteOps.getSiteDeviceAccount(siteId, customHeaders);
    }

    public async getSiteCapacity(siteId?: string, customHeaders?: CustomHeaders): Promise<unknown> {
        return await this.siteOps.getSiteCapacity(siteId, customHeaders);
    }

    public async getSiteTemplateList(page?: number, pageSize?: number, customHeaders?: CustomHeaders): Promise<unknown> {
        return await this.siteOps.getSiteTemplateList(page, pageSize, customHeaders);
    }

    public async getSiteTemplateDetail(siteTemplateId: string, customHeaders?: CustomHeaders): Promise<unknown> {
        return await this.siteOps.getSiteTemplateDetail(siteTemplateId, customHeaders);
    }

    public async getSiteTemplateConfig(siteTemplateId: string, customHeaders?: CustomHeaders): Promise<unknown> {
        return await this.siteOps.getSiteTemplateConfig(siteTemplateId, customHeaders);
    }

    // Controller operations
    public async getDataRetention(customHeaders?: CustomHeaders): Promise<unknown> {
        return await this.controllerOps.getDataRetention(customHeaders);
    }

    public async getControllerPort(customHeaders?: CustomHeaders): Promise<unknown> {
        return await this.controllerOps.getControllerPort(customHeaders);
    }

    public async getPortalPort(customHeaders?: CustomHeaders): Promise<unknown> {
        return await this.controllerOps.getPortalPort(customHeaders);
    }

    public async getCertificate(customHeaders?: CustomHeaders): Promise<unknown> {
        return await this.controllerOps.getCertificate(customHeaders);
    }

    public async getExperienceImprovement(customHeaders?: CustomHeaders): Promise<unknown> {
        return await this.controllerOps.getExperienceImprovement(customHeaders);
    }

    public async getGlobalDashboardOverview(customHeaders?: CustomHeaders): Promise<unknown> {
        return await this.controllerOps.getGlobalDashboardOverview(customHeaders);
    }

    public async getClientHistoryDataEnable(customHeaders?: CustomHeaders): Promise<unknown> {
        return await this.controllerOps.getClientHistoryDataEnable(customHeaders);
    }

    // Maintenance operations
    public async getBackupFileList(customHeaders?: CustomHeaders): Promise<unknown> {
        return await this.maintenanceOps.getBackupFileList(customHeaders);
    }

    public async getBackupResult(customHeaders?: CustomHeaders): Promise<unknown> {
        return await this.maintenanceOps.getBackupResult(customHeaders);
    }

    public async getRestoreResult(customHeaders?: CustomHeaders): Promise<unknown> {
        return await this.maintenanceOps.getRestoreResult(customHeaders);
    }

    public async getSiteBackupResult(siteId?: string, customHeaders?: CustomHeaders): Promise<unknown> {
        return await this.maintenanceOps.getSiteBackupResult(siteId, customHeaders);
    }

    public async getSiteBackupFileList(siteId?: string, customHeaders?: CustomHeaders): Promise<unknown> {
        return await this.maintenanceOps.getSiteBackupFileList(siteId, customHeaders);
    }

    public async getRogueApExport(
        siteId?: string,
        format?: '0' | '1',
        page?: number,
        pageSize?: number,
        customHeaders?: CustomHeaders
    ): Promise<unknown> {
        return await this.maintenanceOps.getRogueApExport(siteId, format, page, pageSize, customHeaders);
    }

    public async backupController(retainUser: boolean, customHeaders?: CustomHeaders): Promise<unknown> {
        return await this.maintenanceOps.backupController(retainUser, customHeaders);
    }

    public async backupControllerToFileServer(
        serverConfig: FileServerConfig,
        filePath: string,
        retainUser: boolean,
        customHeaders?: CustomHeaders
    ): Promise<unknown> {
        return await this.maintenanceOps.backupControllerToFileServer(serverConfig, filePath, retainUser, customHeaders);
    }

    public async restoreController(fileName: string, customHeaders?: CustomHeaders): Promise<unknown> {
        return await this.maintenanceOps.restoreController(fileName, customHeaders);
    }

    public async restoreControllerFromFileServer(
        serverConfig: FileServerConfig,
        filePath: string,
        skipDevice: boolean,
        customHeaders?: CustomHeaders
    ): Promise<unknown> {
        return await this.maintenanceOps.restoreControllerFromFileServer(serverConfig, filePath, skipDevice, customHeaders);
    }

    public async backupSites(siteIds: string[], customHeaders?: CustomHeaders): Promise<unknown> {
        return await this.maintenanceOps.backupSites(siteIds, customHeaders);
    }

    public async backupSitesToFileServer(
        serverConfig: FileServerConfig,
        filePath: string,
        siteIds: string[],
        customHeaders?: CustomHeaders
    ): Promise<unknown> {
        return await this.maintenanceOps.backupSitesToFileServer(serverConfig, filePath, siteIds, customHeaders);
    }

    public async restoreSites(siteRestoreInfos: SiteRestoreInfo[], customHeaders?: CustomHeaders): Promise<unknown> {
        return await this.maintenanceOps.restoreSites(siteRestoreInfos, customHeaders);
    }

    public async restoreSitesFromFileServer(
        serverConfig: FileServerConfig,
        siteInfos: SiteFileRestoreInfo[],
        customHeaders?: CustomHeaders
    ): Promise<unknown> {
        return await this.maintenanceOps.restoreSitesFromFileServer(serverConfig, siteInfos, customHeaders);
    }

    // Account operations
    public async getAllCloudUsers(customHeaders?: CustomHeaders): Promise<unknown> {
        return await this.accountOps.getAllCloudUsers(customHeaders);
    }

    public async getAllLocalUsers(customHeaders?: CustomHeaders): Promise<unknown> {
        return await this.accountOps.getAllLocalUsers(customHeaders);
    }

    public async getAllRoles(customHeaders?: CustomHeaders): Promise<unknown> {
        // Delegate to AccountOperations — single source of truth for /roles endpoint
        return await this.accountOps.getAllRoles(customHeaders);
    }

    public async getRoleDetail(roleId: string, customHeaders?: CustomHeaders): Promise<unknown> {
        return await this.accountOps.getRoleDetail(roleId, customHeaders);
    }

    public async getAvailableRoles(customHeaders?: CustomHeaders): Promise<unknown> {
        return await this.accountOps.getAvailableRoles(customHeaders);
    }

    public async getAllUsersApp(customHeaders?: CustomHeaders): Promise<unknown[]> {
        return await this.accountOps.getAllUsersApp(customHeaders);
    }

    public async getCloudAccessStatus(customHeaders?: CustomHeaders): Promise<unknown> {
        return await this.accountOps.getCloudAccessStatus(customHeaders);
    }

    public async getCloudUserInfo(customHeaders?: CustomHeaders): Promise<unknown> {
        return await this.accountOps.getCloudUserInfo(customHeaders);
    }

    public async getMfaStatus(customHeaders?: CustomHeaders): Promise<unknown> {
        return await this.accountOps.getMfaStatus(customHeaders);
    }

    public async getRemoteBindingStatus(customHeaders?: CustomHeaders): Promise<unknown> {
        return await this.accountOps.getRemoteBindingStatus(customHeaders);
    }

    public async createRole(payload: Input<typeof schemas.modifyControllerRoleVO01Schema>, customHeaders?: CustomHeaders): Promise<unknown> {
        return await this.accountOps.createRole(payload, customHeaders);
    }

    public async updateRole(
        roleId: string,
        payload: Input<typeof schemas.modifyControllerRoleVO01Schema>,
        customHeaders?: CustomHeaders
    ): Promise<unknown> {
        return await this.accountOps.updateRole(roleId, payload, customHeaders);
    }

    public async deleteRole(roleId: string, customHeaders?: CustomHeaders): Promise<unknown> {
        return await this.accountOps.deleteRole(roleId, customHeaders);
    }

    public async setMfaStatus(payload: Input<typeof schemas.mFAConfigOpenApiVO01Schema>, customHeaders?: CustomHeaders): Promise<unknown> {
        return await this.accountOps.setMfaStatus(payload, customHeaders);
    }

    public async listSamlIdps(customHeaders?: CustomHeaders): Promise<unknown[]> {
        return await this.accountOps.listSamlIdps(customHeaders);
    }

    public async createSamlIdp(payload: Input<typeof schemas.idpMetadataOpenApiVO01Schema>, customHeaders?: CustomHeaders): Promise<unknown> {
        return await this.accountOps.createSamlIdp(payload, customHeaders);
    }

    public async updateSamlIdp(
        idpId: string,
        payload: Input<typeof schemas.idpMetadataOpenApiVO01Schema>,
        customHeaders?: CustomHeaders
    ): Promise<unknown> {
        return await this.accountOps.updateSamlIdp(idpId, payload, customHeaders);
    }

    public async deleteSamlIdp(idpId: string, customHeaders?: CustomHeaders): Promise<unknown> {
        return await this.accountOps.deleteSamlIdp(idpId, customHeaders);
    }

    public async listExternalUserGroups(customHeaders?: CustomHeaders): Promise<unknown[]> {
        return await this.accountOps.listExternalUserGroups(customHeaders);
    }

    public async createExternalUserGroup(
        payload: Input<typeof schemas.externalUserGroupOpenApiVO01Schema>,
        customHeaders?: CustomHeaders
    ): Promise<unknown> {
        return await this.accountOps.createExternalUserGroup(payload, customHeaders);
    }

    public async updateExternalUserGroup(
        groupId: string,
        payload: Input<typeof schemas.externalUserGroupOpenApiVO01Schema>,
        customHeaders?: CustomHeaders
    ): Promise<unknown> {
        return await this.accountOps.updateExternalUserGroup(groupId, payload, customHeaders);
    }

    public async deleteExternalUserGroup(groupId: string, customHeaders?: CustomHeaders): Promise<unknown> {
        return await this.accountOps.deleteExternalUserGroup(groupId, customHeaders);
    }

    public async listExternalUsers(customHeaders?: CustomHeaders): Promise<unknown[]> {
        return await this.accountOps.listExternalUsers(customHeaders);
    }

    public async getBackupSchedule(customHeaders?: CustomHeaders): Promise<unknown> {
        return await this.maintenanceOps.getBackupSchedule(customHeaders);
    }

    public async setBackupSchedule(payload: Input<typeof schemas.autoBackupOpenApiVO08Schema>, customHeaders?: CustomHeaders): Promise<unknown> {
        return await this.maintenanceOps.setBackupSchedule(payload, customHeaders);
    }

    // Schedule operations
    public async getUpgradeScheduleList(siteId?: string, customHeaders?: CustomHeaders): Promise<unknown> {
        return await this.scheduleOps.getUpgradeScheduleList(siteId, customHeaders);
    }

    public async getRebootScheduleList(siteTemplateId: string, customHeaders?: CustomHeaders): Promise<unknown> {
        return await this.scheduleOps.getRebootScheduleList(siteTemplateId, customHeaders);
    }

    public async getPoeScheduleList(siteId?: string, customHeaders?: CustomHeaders): Promise<unknown[]> {
        return await this.scheduleOps.getPoeScheduleList(siteId, customHeaders);
    }

    public async getPortScheduleList(siteId?: string, customHeaders?: CustomHeaders): Promise<unknown[]> {
        return await this.scheduleOps.getPortScheduleList(siteId, customHeaders);
    }

    public async getPortSchedulePorts(siteId?: string, customHeaders?: CustomHeaders): Promise<unknown> {
        return await this.scheduleOps.getPortSchedulePorts(siteId, customHeaders);
    }

    // Generic API call
    public async callApi<T = unknown>(config: AxiosRequestConfig, customHeaders?: CustomHeaders): Promise<T> {
        return await this.request.request<T>(config, true, customHeaders);
    }

    /**
     * Build a full Omada API path from a relative path.
     * @param relativePath - The relative path to append to the base API path
     * @param version - The API version to use (default: 'v1')
     */
    private buildOmadaPath(relativePath: string, version = 'v1'): string {
        const normalized = scopeTemplatePath(relativePath.startsWith('/') ? relativePath : `/${relativePath}`);
        return `/openapi/${version}/${encodeURIComponent(this.omadacId)}${normalized}`;
    }

    // ---- Site configuration writes (siteConfig.ts) ----

    public async createLanNetwork(payload: Input<typeof schemas.lanNetworkOpenApiV2VOSchema>, siteId?: string, h?: CustomHeaders): Promise<unknown> {
        return await this.siteConfigOps.createLanNetwork(payload, siteId, h);
    }

    public async updateLanNetwork(
        networkId: string,
        payload: Input<typeof schemas.lanNetworkOpenApiV2VOSchema>,
        siteId?: string,
        h?: CustomHeaders
    ): Promise<unknown> {
        return await this.siteConfigOps.updateLanNetwork(networkId, payload, siteId, h);
    }

    public async deleteLanNetwork(networkId: string, siteId?: string, h?: CustomHeaders): Promise<unknown> {
        return await this.siteConfigOps.deleteLanNetwork(networkId, siteId, h);
    }

    public async createLanProfile(
        payload: Input<typeof schemas.lanProfileConfigOpenApiVOSchema>,
        siteId?: string,
        h?: CustomHeaders
    ): Promise<unknown> {
        return await this.siteConfigOps.createLanProfile(payload, siteId, h);
    }

    public async updateLanProfile(
        profileId: string,
        payload: Input<typeof schemas.lanProfileConfigOpenApiVOSchema>,
        siteId?: string,
        h?: CustomHeaders
    ): Promise<unknown> {
        return await this.siteConfigOps.updateLanProfile(profileId, payload, siteId, h);
    }

    public async deleteLanProfile(profileId: string, siteId?: string, h?: CustomHeaders): Promise<unknown> {
        return await this.siteConfigOps.deleteLanProfile(profileId, siteId, h);
    }

    public async createWlanGroup(
        payload: Input<typeof schemas.createWlanGroupOpenApiVOSchema>,
        siteId?: string,
        h?: CustomHeaders
    ): Promise<unknown> {
        return await this.siteConfigOps.createWlanGroup(payload, siteId, h);
    }

    public async updateWlanGroup(
        wlanId: string,
        payload: Input<typeof schemas.updateWlanGroupOpenApiVOSchema>,
        siteId?: string,
        h?: CustomHeaders
    ): Promise<unknown> {
        return await this.siteConfigOps.updateWlanGroup(wlanId, payload, siteId, h);
    }

    public async deleteWlanGroup(wlanId: string, siteId?: string, h?: CustomHeaders): Promise<unknown> {
        return await this.siteConfigOps.deleteWlanGroup(wlanId, siteId, h);
    }

    public async createSsid(
        wlanId: string,
        payload: Input<typeof schemas.createSsidOpenApiVOSchema>,
        siteId?: string,
        h?: CustomHeaders
    ): Promise<unknown> {
        return await this.siteConfigOps.createSsid(wlanId, payload, siteId, h);
    }

    public async deleteSsid(wlanId: string, ssidId: string, siteId?: string, h?: CustomHeaders): Promise<unknown> {
        return await this.siteConfigOps.deleteSsid(wlanId, ssidId, siteId, h);
    }

    public async createGroupProfile(payload: Input<typeof schemas.createGroupOpenApiVOSchema>, siteId?: string, h?: CustomHeaders): Promise<unknown> {
        return await this.siteConfigOps.createGroupProfile(payload, siteId, h);
    }

    public async updateGroupProfile(
        groupType: string,
        groupId: string,
        payload: Input<typeof schemas.createGroupOpenApiVOSchema>,
        siteId?: string,
        h?: CustomHeaders
    ): Promise<unknown> {
        return await this.siteConfigOps.updateGroupProfile(groupType, groupId, payload, siteId, h);
    }

    public async deleteGroupProfile(groupType: string, groupId: string, siteId?: string, h?: CustomHeaders): Promise<unknown> {
        return await this.siteConfigOps.deleteGroupProfile(groupType, groupId, siteId, h);
    }

    public async listMdnsRules(siteId?: string, h?: CustomHeaders): Promise<unknown[]> {
        return await this.siteConfigOps.listMdnsRules(siteId, h);
    }

    public async createMdnsRule(payload: Input<typeof schemas.createMdnsRuleOpenApiVOSchema>, siteId?: string, h?: CustomHeaders): Promise<unknown> {
        return await this.siteConfigOps.createMdnsRule(payload, siteId, h);
    }

    public async updateMdnsRule(
        mdnsId: string,
        payload: Input<typeof schemas.createMdnsRuleOpenApiVOSchema>,
        siteId?: string,
        h?: CustomHeaders
    ): Promise<unknown> {
        return await this.siteConfigOps.updateMdnsRule(mdnsId, payload, siteId, h);
    }

    public async deleteMdnsRule(mdnsId: string, siteId?: string, h?: CustomHeaders): Promise<unknown> {
        return await this.siteConfigOps.deleteMdnsRule(mdnsId, siteId, h);
    }

    public async listLanDnsRules(siteId?: string, h?: CustomHeaders): Promise<unknown[]> {
        return await this.siteConfigOps.listLanDnsRules(siteId, h);
    }

    public async createLanDnsRule(payload: Input<typeof schemas.lanDnsOpenApiVOSchema>, siteId?: string, h?: CustomHeaders): Promise<unknown> {
        return await this.siteConfigOps.createLanDnsRule(payload, siteId, h);
    }

    public async updateLanDnsRule(
        dnsId: string,
        payload: Input<typeof schemas.lanDnsOpenApiVOSchema>,
        siteId?: string,
        h?: CustomHeaders
    ): Promise<unknown> {
        return await this.siteConfigOps.updateLanDnsRule(dnsId, payload, siteId, h);
    }

    public async deleteLanDnsRule(dnsId: string, siteId?: string, h?: CustomHeaders): Promise<unknown> {
        return await this.siteConfigOps.deleteLanDnsRule(dnsId, siteId, h);
    }

    public async listDdnsEntries(siteId?: string, h?: CustomHeaders): Promise<unknown[]> {
        return await this.siteConfigOps.listDdnsEntries(siteId, h);
    }

    public async createDdnsEntry(payload: Input<typeof schemas.createDdnsOpenApiVOSchema>, siteId?: string, h?: CustomHeaders): Promise<unknown> {
        return await this.siteConfigOps.createDdnsEntry(payload, siteId, h);
    }

    public async updateDdnsEntry(
        ddnsId: string,
        payload: Input<typeof schemas.createDdnsOpenApiVOSchema>,
        siteId?: string,
        h?: CustomHeaders
    ): Promise<unknown> {
        return await this.siteConfigOps.updateDdnsEntry(ddnsId, payload, siteId, h);
    }

    public async deleteDdnsEntry(ddnsId: string, siteId?: string, h?: CustomHeaders): Promise<unknown> {
        return await this.siteConfigOps.deleteDdnsEntry(ddnsId, siteId, h);
    }

    public async setUpnpSetting(payload: Input<typeof schemas.upnpSettingOpenApiVOSchema>, siteId?: string, h?: CustomHeaders): Promise<unknown> {
        return await this.siteConfigOps.setUpnpSetting(payload, siteId, h);
    }

    public async setAlgSetting(payload: Input<typeof schemas.aLGSettingSchema>, siteId?: string, h?: CustomHeaders): Promise<unknown> {
        return await this.siteConfigOps.setAlgSetting(payload, siteId, h);
    }

    public async setSnmpSetting(payload: Input<typeof schemas.snmpSettingOpenApiVOSchema>, siteId?: string, h?: CustomHeaders): Promise<unknown> {
        return await this.siteConfigOps.setSnmpSetting(payload, siteId, h);
    }

    public async createPortForwarding(
        payload: Input<typeof schemas.portForwardingConfigSchema>,
        siteId?: string,
        h?: CustomHeaders
    ): Promise<unknown> {
        return await this.siteConfigOps.createPortForwarding(payload, siteId, h);
    }

    public async updatePortForwarding(
        portForwardingId: string,
        payload: Input<typeof schemas.portForwardingConfigSchema>,
        siteId?: string,
        h?: CustomHeaders
    ): Promise<unknown> {
        return await this.siteConfigOps.updatePortForwarding(portForwardingId, payload, siteId, h);
    }

    public async deletePortForwarding(portForwardingId: string, siteId?: string, h?: CustomHeaders): Promise<unknown> {
        return await this.siteConfigOps.deletePortForwarding(portForwardingId, siteId, h);
    }

    public async createOneToOneNat(payload: Input<typeof schemas.otoNatOpenApiVOSchema>, siteId?: string, h?: CustomHeaders): Promise<unknown> {
        return await this.siteConfigOps.createOneToOneNat(payload, siteId, h);
    }

    public async updateOneToOneNat(
        otonatId: string,
        payload: Input<typeof schemas.otoNatOpenApiVOSchema>,
        siteId?: string,
        h?: CustomHeaders
    ): Promise<unknown> {
        return await this.siteConfigOps.updateOneToOneNat(otonatId, payload, siteId, h);
    }

    public async deleteOneToOneNat(otonatId: string, siteId?: string, h?: CustomHeaders): Promise<unknown> {
        return await this.siteConfigOps.deleteOneToOneNat(otonatId, siteId, h);
    }

    public async createStaticRoute(payload: Input<typeof schemas.staticRoutingConfigSchema>, siteId?: string, h?: CustomHeaders): Promise<unknown> {
        return await this.siteConfigOps.createStaticRoute(payload, siteId, h);
    }

    public async updateStaticRoute(
        staticRoutingId: string,
        payload: Input<typeof schemas.staticRoutingConfigSchema>,
        siteId?: string,
        h?: CustomHeaders
    ): Promise<unknown> {
        return await this.siteConfigOps.updateStaticRoute(staticRoutingId, payload, siteId, h);
    }

    public async deleteStaticRoute(staticRoutingId: string, siteId?: string, h?: CustomHeaders): Promise<unknown> {
        return await this.siteConfigOps.deleteStaticRoute(staticRoutingId, siteId, h);
    }

    public async createPolicyRoute(payload: Input<typeof schemas.policyRoutingConfigSchema>, siteId?: string, h?: CustomHeaders): Promise<unknown> {
        return await this.siteConfigOps.createPolicyRoute(payload, siteId, h);
    }

    public async updatePolicyRoute(
        policyRoutingId: string,
        payload: Input<typeof schemas.policyRoutingConfigSchema>,
        siteId?: string,
        h?: CustomHeaders
    ): Promise<unknown> {
        return await this.siteConfigOps.updatePolicyRoute(policyRoutingId, payload, siteId, h);
    }

    public async deletePolicyRoute(policyRoutingId: string, siteId?: string, h?: CustomHeaders): Promise<unknown> {
        return await this.siteConfigOps.deletePolicyRoute(policyRoutingId, siteId, h);
    }

    public async listUrlFilterRules(type: z.input<typeof urlFilterTypeSchema>, siteId?: string, h?: CustomHeaders): Promise<unknown[]> {
        return await this.siteConfigOps.listUrlFilterRules(type, siteId, h);
    }

    public async createUrlFilterRule(
        payload: Input<typeof schemas.urlFilteringOpenApiVOSchema>,
        siteId?: string,
        h?: CustomHeaders
    ): Promise<unknown> {
        return await this.siteConfigOps.createUrlFilterRule(payload, siteId, h);
    }

    public async updateUrlFilterRule(
        ruleId: string,
        payload: Input<typeof schemas.urlFilteringOpenApiVOSchema>,
        siteId?: string,
        h?: CustomHeaders
    ): Promise<unknown> {
        return await this.siteConfigOps.updateUrlFilterRule(ruleId, payload, siteId, h);
    }

    public async deleteUrlFilterRule(ruleId: string, siteId?: string, h?: CustomHeaders): Promise<unknown> {
        return await this.siteConfigOps.deleteUrlFilterRule(ruleId, siteId, h);
    }

    public async setAttackDefenseSetting(
        payload: Input<typeof schemas.attackDefenseSettingSchema>,
        siteId?: string,
        h?: CustomHeaders
    ): Promise<unknown> {
        return await this.siteConfigOps.setAttackDefenseSetting(payload, siteId, h);
    }

    public async setIpsConfig(payload: Input<typeof schemas.ipsInfoSchema>, siteId?: string, h?: CustomHeaders): Promise<unknown> {
        return await this.siteConfigOps.setIpsConfig(payload, siteId, h);
    }

    public async listMacFilters(list: z.input<typeof macFilterListSchema>, siteId?: string, h?: CustomHeaders): Promise<unknown[]> {
        return await this.siteConfigOps.listMacFilters(list, siteId, h);
    }

    public async createMacFilter(payload: Input<typeof schemas.macFilteringSchema>, siteId?: string, h?: CustomHeaders): Promise<unknown> {
        return await this.siteConfigOps.createMacFilter(payload, siteId, h);
    }

    public async updateMacFilter(
        filterId: string,
        payload: Input<typeof schemas.macFilteringSchema>,
        siteId?: string,
        h?: CustomHeaders
    ): Promise<unknown> {
        return await this.siteConfigOps.updateMacFilter(filterId, payload, siteId, h);
    }

    public async deleteMacFilter(filterId: string, siteId?: string, h?: CustomHeaders): Promise<unknown> {
        return await this.siteConfigOps.deleteMacFilter(filterId, siteId, h);
    }

    public async deleteSiteToSiteVpn(vpnId: string, siteId?: string, h?: CustomHeaders): Promise<unknown> {
        return await this.siteConfigOps.deleteSiteToSiteVpn(vpnId, siteId, h);
    }

    public async updateSiteToSiteVpn(
        vpnId: string,
        payload: Input<typeof schemas.siteToSiteVpnSchema>,
        siteId?: string,
        h?: CustomHeaders
    ): Promise<unknown> {
        return await this.siteConfigOps.updateSiteToSiteVpn(vpnId, payload, siteId, h);
    }

    public async deleteClientToSiteVpnServer(vpnId: string, siteId?: string, h?: CustomHeaders): Promise<unknown> {
        return await this.siteConfigOps.deleteClientToSiteVpnServer(vpnId, siteId, h);
    }

    public async updateClientToSiteVpnServer(
        vpnId: string,
        payload: Input<typeof schemas.clientToSiteVpnServerSchema>,
        siteId?: string,
        h?: CustomHeaders
    ): Promise<unknown> {
        return await this.siteConfigOps.updateClientToSiteVpnServer(vpnId, payload, siteId, h);
    }

    public async deleteClientToSiteVpnClient(vpnId: string, siteId?: string, h?: CustomHeaders): Promise<unknown> {
        return await this.siteConfigOps.deleteClientToSiteVpnClient(vpnId, siteId, h);
    }

    public async updateClientToSiteVpnClient(
        vpnId: string,
        payload: Input<typeof schemas.clientToSiteVpnClientSchema>,
        siteId?: string,
        h?: CustomHeaders
    ): Promise<unknown> {
        return await this.siteConfigOps.updateClientToSiteVpnClient(vpnId, payload, siteId, h);
    }

    public async listClientToSiteVpnClientEntries(siteId?: string, h?: CustomHeaders): Promise<unknown[]> {
        return await this.siteConfigOps.listClientToSiteVpnClientEntries(siteId, h);
    }

    public async listWireguardTunnels(siteId?: string, h?: CustomHeaders): Promise<unknown[]> {
        return await this.siteConfigOps.listWireguardTunnels(siteId, h);
    }

    public async listWireguardPeerEntries(siteId?: string, h?: CustomHeaders): Promise<unknown[]> {
        return await this.siteConfigOps.listWireguardPeerEntries(siteId, h);
    }

    public async updateWireguard(
        id: string,
        payload: Input<typeof schemas.wireguardOpenApiVOSchema>,
        siteId?: string,
        h?: CustomHeaders
    ): Promise<unknown> {
        return await this.siteConfigOps.updateWireguard(id, payload, siteId, h);
    }

    public async deleteWireguard(id: string, siteId?: string, h?: CustomHeaders): Promise<unknown> {
        return await this.siteConfigOps.deleteWireguard(id, siteId, h);
    }

    public async deleteWireguardPeer(id: string, siteId?: string, h?: CustomHeaders): Promise<unknown> {
        return await this.siteConfigOps.deleteWireguardPeer(id, siteId, h);
    }

    public async locateDevice(
        deviceMac: string,
        payload: Input<typeof schemas.locateDeviceRequest03Schema>,
        siteId?: string,
        h?: CustomHeaders
    ): Promise<unknown> {
        return await this.siteConfigOps.locateDevice(deviceMac, payload, siteId, h);
    }

    public async forceProvisionDevice(deviceMac: string, siteId?: string, h?: CustomHeaders): Promise<unknown> {
        return await this.siteConfigOps.forceProvisionDevice(deviceMac, siteId, h);
    }

    public async adoptDevice(
        deviceMac: string,
        payload: Input<typeof schemas.adoptDeviceRequest03Schema>,
        siteId?: string,
        h?: CustomHeaders
    ): Promise<unknown> {
        return await this.siteConfigOps.adoptDevice(deviceMac, payload, siteId, h);
    }

    public async startDeviceOnlineUpgrade(deviceMac: string, siteId?: string, h?: CustomHeaders): Promise<unknown> {
        return await this.siteConfigOps.startDeviceOnlineUpgrade(deviceMac, siteId, h);
    }

    public async recoverSwitchPortPoe(
        switchMac: string,
        payload: Input<typeof schemas.oswPoeRecoverOpenApiVO03Schema>,
        siteId?: string,
        h?: CustomHeaders
    ): Promise<unknown> {
        return await this.siteConfigOps.recoverSwitchPortPoe(switchMac, payload, siteId, h);
    }

    public async setClientName(
        clientMac: string,
        payload: Input<typeof schemas.clientNameSetting05Schema>,
        siteId?: string,
        h?: CustomHeaders
    ): Promise<unknown> {
        return await this.siteConfigOps.setClientName(clientMac, payload, siteId, h);
    }

    public async setClientLockToAp(
        clientMac: string,
        payload: Input<typeof schemas.clientLockToAPSetting05Schema>,
        siteId?: string,
        h?: CustomHeaders
    ): Promise<unknown> {
        return await this.siteConfigOps.setClientLockToAp(clientMac, payload, siteId, h);
    }

    public async authorizeHotspotClient(clientMac: string, siteId?: string, h?: CustomHeaders): Promise<unknown> {
        return await this.siteConfigOps.authorizeHotspotClient(clientMac, siteId, h);
    }

    public async unauthorizeHotspotClient(clientMac: string, siteId?: string, h?: CustomHeaders): Promise<unknown> {
        return await this.siteConfigOps.unauthorizeHotspotClient(clientMac, siteId, h);
    }

    public async listVoucherGroups(siteId?: string, h?: CustomHeaders): Promise<unknown[]> {
        return await this.siteConfigOps.listVoucherGroups(siteId, h);
    }

    public async createVoucherGroup(
        payload: Input<typeof schemas.createVoucherGroupOpenApiVO06Schema>,
        siteId?: string,
        h?: CustomHeaders
    ): Promise<unknown> {
        return await this.siteConfigOps.createVoucherGroup(payload, siteId, h);
    }

    public async deleteVoucherGroup(groupId: string, siteId?: string, h?: CustomHeaders): Promise<unknown> {
        return await this.siteConfigOps.deleteVoucherGroup(groupId, siteId, h);
    }

    public async getVoucherSummary(siteId?: string, h?: CustomHeaders): Promise<unknown> {
        return await this.siteConfigOps.getVoucherSummary(siteId, h);
    }

    public async getHotspotStatistics(range: { start?: number; end?: number }, siteId?: string, h?: CustomHeaders): Promise<unknown> {
        return await this.siteConfigOps.getHotspotStatistics(range, siteId, h);
    }

    public async listHotspotAuthRecords(siteId?: string, h?: CustomHeaders): Promise<unknown[]> {
        return await this.siteConfigOps.listHotspotAuthRecords(siteId, h);
    }

    public async disconnectHotspotAuthRecord(recordId: string, siteId?: string, h?: CustomHeaders): Promise<unknown> {
        return await this.siteConfigOps.disconnectHotspotAuthRecord(recordId, siteId, h);
    }

    public async listHotspotLocalUsers(siteId?: string, h?: CustomHeaders): Promise<unknown[]> {
        return await this.siteConfigOps.listHotspotLocalUsers(siteId, h);
    }

    public async createHotspotLocalUser(
        payload: Input<typeof schemas.createLocalUserOpenApiVO06Schema>,
        siteId?: string,
        h?: CustomHeaders
    ): Promise<unknown> {
        return await this.siteConfigOps.createHotspotLocalUser(payload, siteId, h);
    }

    public async updateHotspotLocalUser(
        userId: string,
        payload: Input<typeof schemas.modifyLocalUserOpenApiVO06Schema>,
        siteId?: string,
        h?: CustomHeaders
    ): Promise<unknown> {
        return await this.siteConfigOps.updateHotspotLocalUser(userId, payload, siteId, h);
    }

    public async deleteHotspotLocalUser(userId: string, siteId?: string, h?: CustomHeaders): Promise<unknown> {
        return await this.siteConfigOps.deleteHotspotLocalUser(userId, siteId, h);
    }

    public async listHotspotOperators(siteId?: string, h?: CustomHeaders): Promise<unknown[]> {
        return await this.siteConfigOps.listHotspotOperators(siteId, h);
    }

    public async createHotspotOperator(payload: Input<typeof schemas.hotspotOperator06Schema>, siteId?: string, h?: CustomHeaders): Promise<unknown> {
        return await this.siteConfigOps.createHotspotOperator(payload, siteId, h);
    }

    public async updateHotspotOperator(
        operatorId: string,
        payload: Input<typeof schemas.hotspotOperator06Schema>,
        siteId?: string,
        h?: CustomHeaders
    ): Promise<unknown> {
        return await this.siteConfigOps.updateHotspotOperator(operatorId, payload, siteId, h);
    }

    public async deleteHotspotOperator(operatorId: string, siteId?: string, h?: CustomHeaders): Promise<unknown> {
        return await this.siteConfigOps.deleteHotspotOperator(operatorId, siteId, h);
    }

    public async createTimeRangeProfile(
        payload: Input<typeof schemas.createTimeRangeProfileOpenApiVOSchema>,
        siteId?: string,
        h?: CustomHeaders
    ): Promise<unknown> {
        return await this.siteConfigOps.createTimeRangeProfile(payload, siteId, h);
    }

    public async updateTimeRangeProfile(
        profileId: string,
        payload: Input<typeof schemas.updateTimeRangeProfileOpenApiVOSchema>,
        siteId?: string,
        h?: CustomHeaders
    ): Promise<unknown> {
        return await this.siteConfigOps.updateTimeRangeProfile(profileId, payload, siteId, h);
    }

    public async deleteTimeRangeProfile(profileId: string, siteId?: string, h?: CustomHeaders): Promise<unknown> {
        return await this.siteConfigOps.deleteTimeRangeProfile(profileId, siteId, h);
    }

    public async createPortSchedule(
        payload: Input<typeof schemas.portScheduleOpenApiVOSchema>,
        siteId?: string,
        h?: CustomHeaders
    ): Promise<unknown> {
        return await this.siteConfigOps.createPortSchedule(payload, siteId, h);
    }

    public async updatePortSchedule(
        scheduleId: string,
        payload: Input<typeof schemas.portScheduleOpenApiVOSchema>,
        siteId?: string,
        h?: CustomHeaders
    ): Promise<unknown> {
        return await this.siteConfigOps.updatePortSchedule(scheduleId, payload, siteId, h);
    }

    public async deletePortSchedule(scheduleId: string, siteId?: string, h?: CustomHeaders): Promise<unknown> {
        return await this.siteConfigOps.deletePortSchedule(scheduleId, siteId, h);
    }

    public async listVpnUsers(siteId?: string, h?: CustomHeaders): Promise<unknown[]> {
        return await this.vpnOps.listVpnUsers(siteId, h);
    }

    public async createVpnUser(payload: Input<typeof schemas.vpnUserConfigVOSchema>, siteId?: string, h?: CustomHeaders): Promise<unknown> {
        return await this.vpnOps.createVpnUser(payload, siteId, h);
    }

    public async updateVpnUser(
        userId: string,
        payload: Input<typeof schemas.vpnUserConfigVOSchema>,
        siteId?: string,
        h?: CustomHeaders
    ): Promise<unknown> {
        return await this.vpnOps.updateVpnUser(userId, payload, siteId, h);
    }

    public async deleteVpnUser(userId: string, siteId?: string, h?: CustomHeaders): Promise<unknown> {
        return await this.vpnOps.deleteVpnUser(userId, siteId, h);
    }

    public async listSslVpnResources(siteId?: string, h?: CustomHeaders): Promise<unknown[]> {
        return await this.vpnOps.listSslVpnResources(siteId, h);
    }

    public async createSslVpnResource(
        payload: Input<typeof schemas.sslVpnResourceConfigOpenApiVOSchema>,
        siteId?: string,
        h?: CustomHeaders
    ): Promise<unknown> {
        return await this.vpnOps.createSslVpnResource(payload, siteId, h);
    }

    public async updateSslVpnResource(
        resourceId: string,
        payload: Input<typeof schemas.sslVpnResourceModifyOpenApiVOSchema>,
        siteId?: string,
        h?: CustomHeaders
    ): Promise<unknown> {
        return await this.vpnOps.updateSslVpnResource(resourceId, payload, siteId, h);
    }

    public async deleteSslVpnResource(resourceId: string, siteId?: string, h?: CustomHeaders): Promise<unknown> {
        return await this.vpnOps.deleteSslVpnResource(resourceId, siteId, h);
    }

    public async listSslVpnResourceGroups(siteId?: string, h?: CustomHeaders): Promise<unknown[]> {
        return await this.vpnOps.listSslVpnResourceGroups(siteId, h);
    }

    public async createSslVpnResourceGroup(
        payload: Input<typeof schemas.sslVpnResourceGroupConfigOpenApiVOSchema>,
        siteId?: string,
        h?: CustomHeaders
    ): Promise<unknown> {
        return await this.vpnOps.createSslVpnResourceGroup(payload, siteId, h);
    }

    public async updateSslVpnResourceGroup(
        groupId: string,
        payload: Input<typeof schemas.sslVpnResourceGroupModifyOpenApiVOSchema>,
        siteId?: string,
        h?: CustomHeaders
    ): Promise<unknown> {
        return await this.vpnOps.updateSslVpnResourceGroup(groupId, payload, siteId, h);
    }

    public async deleteSslVpnResourceGroup(groupId: string, siteId?: string, h?: CustomHeaders): Promise<unknown> {
        return await this.vpnOps.deleteSslVpnResourceGroup(groupId, siteId, h);
    }

    public async listSslVpnUserGroups(siteId?: string, h?: CustomHeaders): Promise<unknown[]> {
        return await this.vpnOps.listSslVpnUserGroups(siteId, h);
    }

    public async listSslVpnUserGroupUsers(groupId: string, siteId?: string, h?: CustomHeaders): Promise<unknown[]> {
        return await this.vpnOps.listSslVpnUserGroupUsers(groupId, siteId, h);
    }

    public async createSslVpnUserGroup(
        payload: Input<typeof schemas.sslVpnUserGroupConfigOpenApiVOSchema>,
        siteId?: string,
        h?: CustomHeaders
    ): Promise<unknown> {
        return await this.vpnOps.createSslVpnUserGroup(payload, siteId, h);
    }

    public async updateSslVpnUserGroup(
        groupId: string,
        payload: Input<typeof schemas.sslVpnUserGroupModifyOpenApiVOSchema>,
        siteId?: string,
        h?: CustomHeaders
    ): Promise<unknown> {
        return await this.vpnOps.updateSslVpnUserGroup(groupId, payload, siteId, h);
    }

    public async deleteSslVpnUserGroup(groupId: string, siteId?: string, h?: CustomHeaders): Promise<unknown> {
        return await this.vpnOps.deleteSslVpnUserGroup(groupId, siteId, h);
    }

    public async listSslVpnLocks(siteId?: string, h?: CustomHeaders): Promise<unknown[]> {
        return await this.vpnOps.listSslVpnLocks(siteId, h);
    }

    public async createSslVpnLock(
        payload: Input<typeof schemas.sslVpnLockConfigOpenApiVOSchema>,
        siteId?: string,
        h?: CustomHeaders
    ): Promise<unknown> {
        return await this.vpnOps.createSslVpnLock(payload, siteId, h);
    }

    public async updateSslVpnLock(
        lockId: string,
        payload: Input<typeof schemas.sslVpnLockModifyOpenApiVOSchema>,
        siteId?: string,
        h?: CustomHeaders
    ): Promise<unknown> {
        return await this.vpnOps.updateSslVpnLock(lockId, payload, siteId, h);
    }

    public async deleteSslVpnLock(lockId: string, siteId?: string, h?: CustomHeaders): Promise<unknown> {
        return await this.vpnOps.deleteSslVpnLock(lockId, siteId, h);
    }

    public async getEoGreTunnelConfig(siteId?: string, h?: CustomHeaders): Promise<unknown> {
        return await this.vpnOps.getEoGreTunnelConfig(siteId, h);
    }

    public async setEoGreTunnelConfig(
        payload: Input<typeof schemas.updateEoGreTunnelSettingOpenApiVOSchema>,
        siteId?: string,
        h?: CustomHeaders
    ): Promise<unknown> {
        return await this.vpnOps.setEoGreTunnelConfig(payload, siteId, h);
    }

    public async listVpnServerStatus(vpnType: number, clientMode: number | undefined, siteId?: string, h?: CustomHeaders): Promise<unknown[]> {
        return await this.vpnOps.listVpnServerStatus(vpnType, clientMode, siteId, h);
    }

    public async listVpnServerClientStatus(vpnId: string, siteId?: string, h?: CustomHeaders): Promise<unknown[]> {
        return await this.vpnOps.listVpnServerClientStatus(vpnId, siteId, h);
    }

    public async listVpnClientStatus(vpnType: number, siteId?: string, h?: CustomHeaders): Promise<unknown[]> {
        return await this.vpnOps.listVpnClientStatus(vpnType, siteId, h);
    }

    public async listSiteToSiteVpnStatus(vpnType: number, siteId?: string, h?: CustomHeaders): Promise<unknown[]> {
        return await this.vpnOps.listSiteToSiteVpnStatus(vpnType, siteId, h);
    }

    public async listSiteToSiteVpnPeerStatus(vpnId: string, siteId?: string, h?: CustomHeaders): Promise<unknown[]> {
        return await this.vpnOps.listSiteToSiteVpnPeerStatus(vpnId, siteId, h);
    }

    public async listSwitchPortPoeInfo(siteId?: string, h?: CustomHeaders): Promise<unknown[]> {
        return await this.switchOps.listSwitchPortPoeInfo(siteId, h);
    }

    public async listSwitchPortOverview(siteId?: string, h?: CustomHeaders): Promise<unknown[]> {
        return await this.switchOps.listSwitchPortOverview(siteId, h);
    }

    public async listSwitchPortCounters(siteId?: string, h?: CustomHeaders): Promise<unknown[]> {
        return await this.switchOps.listSwitchPortCounters(siteId, h);
    }

    public async getSwitchPortView(siteId?: string, h?: CustomHeaders): Promise<unknown> {
        return await this.switchOps.getSwitchPortView(siteId, h);
    }

    public async listSwitchLldpNeighbors(switchMac: string, siteId?: string, h?: CustomHeaders): Promise<unknown[]> {
        return await this.switchOps.listSwitchLldpNeighbors(switchMac, siteId, h);
    }

    public async listSwitchInterfaces(switchMac: string, siteId?: string, h?: CustomHeaders): Promise<unknown[]> {
        return await this.switchOps.listSwitchInterfaces(switchMac, siteId, h);
    }

    public async getSwitchInterfacesBrief(switchMac: string, siteId?: string, h?: CustomHeaders): Promise<unknown> {
        return await this.switchOps.getSwitchInterfacesBrief(switchMac, siteId, h);
    }

    public async listSwitchPortLagNetworks(switchMac: string, siteId?: string, h?: CustomHeaders): Promise<unknown[]> {
        return await this.switchOps.listSwitchPortLagNetworks(switchMac, siteId, h);
    }

    public async listSwitchNetworksDetail(switchMac: string, siteId?: string, h?: CustomHeaders): Promise<unknown[]> {
        return await this.switchOps.listSwitchNetworksDetail(switchMac, siteId, h);
    }

    public async getSwitchExistingNetworks(switchMac: string, siteId?: string, h?: CustomHeaders): Promise<unknown> {
        return await this.switchOps.getSwitchExistingNetworks(switchMac, siteId, h);
    }

    public async listSwitchDhcpUsers(switchMac: string, siteId?: string, h?: CustomHeaders): Promise<unknown[]> {
        return await this.switchOps.listSwitchDhcpUsers(switchMac, siteId, h);
    }

    public async getSwitchDdmInfo(switchMac: string, siteId?: string, h?: CustomHeaders): Promise<unknown> {
        return await this.switchOps.getSwitchDdmInfo(switchMac, siteId, h);
    }

    public async getSwitchHealthDetail(
        switchMac: string,
        range: z.input<typeof healthRangeSchema>,
        siteId?: string,
        h?: CustomHeaders
    ): Promise<unknown> {
        return await this.switchOps.getSwitchHealthDetail(switchMac, range, siteId, h);
    }

    public async getSwitchHealthTimeline(
        switchMac: string,
        range: z.input<typeof healthRangeSchema>,
        siteId?: string,
        h?: CustomHeaders
    ): Promise<unknown> {
        return await this.switchOps.getSwitchHealthTimeline(switchMac, range, siteId, h);
    }

    public async listSwitchPortTags(siteId?: string, h?: CustomHeaders): Promise<unknown> {
        return await this.switchOps.listSwitchPortTags(siteId, h);
    }

    public async createSwitchPortTag(
        payload: Input<typeof schemas.createPortTagOpenApiVO03Schema>,
        siteId?: string,
        h?: CustomHeaders
    ): Promise<unknown> {
        return await this.switchOps.createSwitchPortTag(payload, siteId, h);
    }

    public async updateSwitchPortTag(payload: Input<typeof schemas.portTagOpenApiVO03Schema>, siteId?: string, h?: CustomHeaders): Promise<unknown> {
        return await this.switchOps.updateSwitchPortTag(payload, siteId, h);
    }

    public async deleteSwitchPortTag(tagId: string, siteId?: string, h?: CustomHeaders): Promise<unknown> {
        return await this.switchOps.deleteSwitchPortTag(tagId, siteId, h);
    }

    public async setSwitchGeneralConfig(
        switchMac: string,
        payload: Input<typeof switchGeneralSettingsSchema>,
        siteId?: string,
        h?: CustomHeaders
    ): Promise<unknown> {
        return await this.switchOps.setSwitchGeneralConfig(switchMac, payload, siteId, h);
    }

    public async startSwitchCableTest(switchMac: string, ports: number[], siteId?: string, h?: CustomHeaders): Promise<unknown> {
        return await this.switchOps.startSwitchCableTest(switchMac, ports, siteId, h);
    }

    public async cancelSwitchCableTest(switchMac: string, siteId?: string, h?: CustomHeaders): Promise<unknown> {
        return await this.switchOps.cancelSwitchCableTest(switchMac, siteId, h);
    }

    public async clearSwitchPortCounters(
        payload: Input<typeof schemas.clearCountersVO03Schema>,
        siteId?: string,
        h?: CustomHeaders
    ): Promise<unknown> {
        return await this.switchOps.clearSwitchPortCounters(payload, siteId, h);
    }

    public async getApAfcStatus(apMac: string, siteId?: string, h?: CustomHeaders): Promise<unknown> {
        return await this.apOps.getApAfcStatus(apMac, siteId, h);
    }

    public async getApLanTraffic(apMac: string, siteId?: string, h?: CustomHeaders): Promise<unknown> {
        return await this.apOps.getApLanTraffic(apMac, siteId, h);
    }

    public async getApInterferenceDetectionStatus(apMac: string, siteId?: string, h?: CustomHeaders): Promise<unknown> {
        return await this.apOps.getApInterferenceDetectionStatus(apMac, siteId, h);
    }

    public async getApL3Access(apMac: string, siteId?: string, h?: CustomHeaders): Promise<unknown> {
        return await this.apOps.getApL3Access(apMac, siteId, h);
    }

    public async getApLagConfig(apMac: string, siteId?: string, h?: CustomHeaders): Promise<unknown> {
        return await this.apOps.getApLagConfig(apMac, siteId, h);
    }

    public async getApManagementWlan(apMac: string, siteId?: string, h?: CustomHeaders): Promise<unknown> {
        return await this.apOps.getApManagementWlan(apMac, siteId, h);
    }

    public async listApPortVlans(apMac: string, siteId?: string, h?: CustomHeaders): Promise<unknown[]> {
        return await this.apOps.listApPortVlans(apMac, siteId, h);
    }

    public async getApSsidOverrides(apMac: string, siteId?: string, h?: CustomHeaders): Promise<unknown> {
        return await this.apOps.getApSsidOverrides(apMac, siteId, h);
    }

    public async setApSsidOverrides(
        apMac: string,
        payload: Input<typeof schemas.apSsidOverrideOpenApiV2VO03Schema>,
        siteId?: string,
        h?: CustomHeaders
    ): Promise<unknown> {
        return await this.apOps.setApSsidOverrides(apMac, payload, siteId, h);
    }

    public async getApRfScanResult(apMac: string, siteId?: string, h?: CustomHeaders): Promise<unknown> {
        return await this.apOps.getApRfScanResult(apMac, siteId, h);
    }

    public async startApRfScan(
        apMac: string,
        payload: Input<typeof schemas.rFScanCommand03Schema>,
        siteId?: string,
        h?: CustomHeaders
    ): Promise<unknown> {
        return await this.apOps.startApRfScan(apMac, payload, siteId, h);
    }

    public async listLockToApAps(siteId?: string, h?: CustomHeaders): Promise<unknown> {
        return await this.apOps.listLockToApAps(siteId, h);
    }

    public async getClientConnectionHistory(
        mac: string,
        range: z.input<typeof msRangeSchema>,
        siteId?: string,
        customHeaders?: CustomHeaders
    ): Promise<unknown> {
        return await this.clientOps.getClientConnectionHistory(mac, range, siteId, customHeaders);
    }

    public async getClientTimeline(
        mac: string,
        range: z.input<typeof msRangeSchema>,
        type: z.input<typeof clientTimelineTypeSchema>,
        siteId?: string,
        customHeaders?: CustomHeaders
    ): Promise<unknown> {
        return await this.clientOps.getClientTimeline(mac, range, type, siteId, customHeaders);
    }

    public async getClientHealthDetail(
        mac: string,
        range: z.input<typeof msRangeSchema>,
        siteId?: string,
        customHeaders?: CustomHeaders
    ): Promise<unknown> {
        return await this.clientOps.getClientHealthDetail(mac, range, siteId, customHeaders);
    }

    public async getClientHealthTimeline(
        mac: string,
        range: z.input<typeof msRangeSchema>,
        siteId?: string,
        customHeaders?: CustomHeaders
    ): Promise<unknown> {
        return await this.clientOps.getClientHealthTimeline(mac, range, siteId, customHeaders);
    }

    public async getClientSearchFieldOptions(siteId?: string, customHeaders?: CustomHeaders): Promise<unknown> {
        return await this.clientOps.getClientSearchFieldOptions(siteId, customHeaders);
    }

    public async getClientCorrectionOptions(customHeaders?: CustomHeaders): Promise<unknown> {
        return await this.clientOps.getClientCorrectionOptions(customHeaders);
    }

    public async getClientLinkTopology(mac: string, siteId?: string, customHeaders?: CustomHeaders): Promise<unknown> {
        return await this.clientOps.getClientLinkTopology(mac, siteId, customHeaders);
    }

    public async getClientStats(
        mac: string,
        granularity: z.input<typeof clientStatGranularitySchema>,
        query: z.input<typeof schemas.clientStatQuery05Schema>,
        siteId?: string,
        customHeaders?: CustomHeaders
    ): Promise<unknown> {
        return await this.clientOps.getClientStats(mac, granularity, query, siteId, customHeaders);
    }

    public async getClientIncidentCounts(
        payload: z.input<typeof schemas.clientIncidentCountRequestOpenApiVO05Schema>,
        siteId?: string,
        customHeaders?: CustomHeaders
    ): Promise<unknown> {
        return await this.clientOps.getClientIncidentCounts(payload, siteId, customHeaders);
    }

    // ---- Site profiles (ProfileOperations) ----
    public async createRateLimitProfile(
        payload: z.input<typeof schemas.createRateLimitProfileOpenApiVOSchema>,
        siteId?: string,
        h?: CustomHeaders
    ): Promise<unknown> {
        return await this.profileOps.createRateLimitProfile(payload, siteId, h);
    }

    public async updateRateLimitProfile(
        profileId: string,
        payload: z.input<typeof schemas.updateRateLimitProfileOpenApiVOSchema>,
        siteId?: string,
        h?: CustomHeaders
    ): Promise<unknown> {
        return await this.profileOps.updateRateLimitProfile(profileId, payload, siteId, h);
    }

    public async deleteRateLimitProfile(profileId: string, siteId?: string, h?: CustomHeaders): Promise<unknown> {
        return await this.profileOps.deleteRateLimitProfile(profileId, siteId, h);
    }

    public async createServiceType(payload: z.input<typeof serviceTypePayloadSchema>, siteId?: string, h?: CustomHeaders): Promise<unknown> {
        return await this.profileOps.createServiceType(payload, siteId, h);
    }

    public async updateServiceType(
        id: string,
        payload: z.input<typeof serviceTypePayloadSchema>,
        siteId?: string,
        h?: CustomHeaders
    ): Promise<unknown> {
        return await this.profileOps.updateServiceType(id, payload, siteId, h);
    }

    public async deleteServiceType(id: string, siteId?: string, h?: CustomHeaders): Promise<unknown> {
        return await this.profileOps.deleteServiceType(id, siteId, h);
    }

    public async createMdnsProfile(payload: z.input<typeof bonjourServicePayloadSchema>, siteId?: string, h?: CustomHeaders): Promise<unknown> {
        return await this.profileOps.createMdnsProfile(payload, siteId, h);
    }

    public async updateMdnsProfile(
        id: string,
        payload: z.input<typeof bonjourServicePayloadSchema>,
        siteId?: string,
        h?: CustomHeaders
    ): Promise<unknown> {
        return await this.profileOps.updateMdnsProfile(id, payload, siteId, h);
    }

    public async deleteMdnsProfile(id: string, siteId?: string, h?: CustomHeaders): Promise<unknown> {
        return await this.profileOps.deleteMdnsProfile(id, siteId, h);
    }

    public async listApnProfiles(siteId?: string, h?: CustomHeaders): Promise<unknown> {
        return await this.profileOps.listApnProfiles(siteId, h);
    }

    public async createApnProfile(payload: z.input<typeof schemas.apnProfileConfigSchema>, siteId?: string, h?: CustomHeaders): Promise<unknown> {
        return await this.profileOps.createApnProfile(payload, siteId, h);
    }

    public async updateApnProfile(
        profileId: string,
        payload: z.input<typeof schemas.apnProfileConfigSchema>,
        siteId?: string,
        h?: CustomHeaders
    ): Promise<unknown> {
        return await this.profileOps.updateApnProfile(profileId, payload, siteId, h);
    }

    public async deleteApnProfile(profileId: string, siteId?: string, h?: CustomHeaders): Promise<unknown> {
        return await this.profileOps.deleteApnProfile(profileId, siteId, h);
    }

    public async listWifiCallingProfiles(siteId?: string, h?: CustomHeaders): Promise<unknown> {
        return await this.profileOps.listWifiCallingProfiles(siteId, h);
    }

    public async createWifiCallingProfile(
        payload: z.input<typeof wifiCallingProfilePayloadSchema>,
        siteId?: string,
        h?: CustomHeaders
    ): Promise<unknown> {
        return await this.profileOps.createWifiCallingProfile(payload, siteId, h);
    }

    public async copyWifiCallingProfile(
        profileId: string,
        payload: z.input<typeof wifiCallingCopySchema>,
        siteId?: string,
        h?: CustomHeaders
    ): Promise<unknown> {
        return await this.profileOps.copyWifiCallingProfile(profileId, payload, siteId, h);
    }

    public async updateWifiCallingProfile(
        profileId: string,
        payload: z.input<typeof wifiCallingProfilePayloadSchema>,
        siteId?: string,
        h?: CustomHeaders
    ): Promise<unknown> {
        return await this.profileOps.updateWifiCallingProfile(profileId, payload, siteId, h);
    }

    public async deleteWifiCallingProfile(profileId: string, siteId?: string, h?: CustomHeaders): Promise<unknown> {
        return await this.profileOps.deleteWifiCallingProfile(profileId, siteId, h);
    }

    public async listOuiProfileSummaries(siteId?: string, h?: CustomHeaders): Promise<unknown> {
        return await this.profileOps.listOuiProfileSummaries(siteId, h);
    }

    public async createOuiProfile(payload: z.input<typeof ouiProfilePayloadSchema>, siteId?: string, h?: CustomHeaders): Promise<unknown> {
        return await this.profileOps.createOuiProfile(payload, siteId, h);
    }

    public async updateOuiProfile(
        ouiId: string,
        payload: z.input<typeof ouiProfilePayloadSchema>,
        siteId?: string,
        h?: CustomHeaders
    ): Promise<unknown> {
        return await this.profileOps.updateOuiProfile(ouiId, payload, siteId, h);
    }

    public async deleteOuiProfile(ouiId: string, siteId?: string, h?: CustomHeaders): Promise<unknown> {
        return await this.profileOps.deleteOuiProfile(ouiId, siteId, h);
    }

    public async listSwitchOuiRules(siteId?: string, h?: CustomHeaders): Promise<unknown[]> {
        return await this.profileOps.listSwitchOuiRules(siteId, h);
    }

    public async listSwitchOuiValidVlans(siteId?: string, h?: CustomHeaders): Promise<unknown[]> {
        return await this.profileOps.listSwitchOuiValidVlans(siteId, h);
    }

    public async listSwitchOuiRuleSwitches(page: number, pageSize: number, siteId?: string, h?: CustomHeaders): Promise<unknown> {
        return await this.profileOps.listSwitchOuiRuleSwitches(page, pageSize, siteId, h);
    }

    public async listSwitchOuiSupportedSwitches(page: number, pageSize: number, siteId?: string, h?: CustomHeaders): Promise<unknown> {
        return await this.profileOps.listSwitchOuiSupportedSwitches(page, pageSize, siteId, h);
    }

    public async listSwitchOuiAutoAddVlanSwitches(page: number, pageSize: number, siteId?: string, h?: CustomHeaders): Promise<unknown> {
        return await this.profileOps.listSwitchOuiAutoAddVlanSwitches(page, pageSize, siteId, h);
    }

    public async getSwitchOuiAutoAddVlan(siteId?: string, h?: CustomHeaders): Promise<unknown> {
        return await this.profileOps.getSwitchOuiAutoAddVlan(siteId, h);
    }

    public async getSwitchOuiAutoAddVlanAllSupport(siteId?: string, h?: CustomHeaders): Promise<unknown> {
        return await this.profileOps.getSwitchOuiAutoAddVlanAllSupport(siteId, h);
    }

    // ---- LAN services (LanServiceOperations) ----
    public async getLanNetwork(networkId: string, siteId?: string, h?: CustomHeaders): Promise<unknown> {
        return await this.lanServiceOps.getLanNetwork(networkId, siteId, h);
    }

    public async listAllLanNetworks(siteId?: string, h?: CustomHeaders): Promise<unknown> {
        return await this.lanServiceOps.listAllLanNetworks(siteId, h);
    }

    public async listDhcpClients(siteId?: string, h?: CustomHeaders): Promise<unknown[]> {
        return await this.lanServiceOps.listDhcpClients(siteId, h);
    }

    public async listDhcpReservationTargets(siteId?: string, h?: CustomHeaders): Promise<unknown> {
        return await this.lanServiceOps.listDhcpReservationTargets(siteId, h);
    }

    public async setDnsCacheSetting(payload: z.input<typeof schemas.dnsCacheOpenApiVOSchema>, siteId?: string, h?: CustomHeaders): Promise<unknown> {
        return await this.lanServiceOps.setDnsCacheSetting(payload, siteId, h);
    }

    public async clearDnsCache(siteId?: string, h?: CustomHeaders): Promise<unknown> {
        return await this.lanServiceOps.clearDnsCache(siteId, h);
    }

    public async setDnsProxy(payload: z.input<typeof schemas.dnsProxySettingOpenApiVOSchema>, siteId?: string, h?: CustomHeaders): Promise<unknown> {
        return await this.lanServiceOps.setDnsProxy(payload, siteId, h);
    }

    public async setIpMacBindingGeneralSetting(
        payload: z.input<typeof schemas.iPMacBindingGeneralSettingSchema>,
        siteId?: string,
        h?: CustomHeaders
    ): Promise<unknown> {
        return await this.lanServiceOps.setIpMacBindingGeneralSetting(payload, siteId, h);
    }

    public async listLanMulticasts(siteId?: string, h?: CustomHeaders): Promise<unknown[]> {
        return await this.lanServiceOps.listLanMulticasts(siteId, h);
    }

    public async createLanMulticast(payload: z.input<typeof lanMulticastPayloadSchema>, siteId?: string, h?: CustomHeaders): Promise<unknown> {
        return await this.lanServiceOps.createLanMulticast(payload, siteId, h);
    }

    public async updateLanMulticast(
        multicastId: string,
        payload: z.input<typeof lanMulticastPayloadSchema>,
        siteId?: string,
        h?: CustomHeaders
    ): Promise<unknown> {
        return await this.lanServiceOps.updateLanMulticast(multicastId, payload, siteId, h);
    }

    public async deleteLanMulticast(multicastId: string, siteId?: string, h?: CustomHeaders): Promise<unknown> {
        return await this.lanServiceOps.deleteLanMulticast(multicastId, siteId, h);
    }

    public async listApOuiRules(siteId?: string, h?: CustomHeaders): Promise<unknown[]> {
        return await this.lanServiceOps.listApOuiRules(siteId, h);
    }

    public async createApOuiRule(
        payload: z.input<typeof schemas.ouiBasedVlanApOpenApiVOSchema>,
        siteId?: string,
        h?: CustomHeaders
    ): Promise<unknown> {
        return await this.lanServiceOps.createApOuiRule(payload, siteId, h);
    }

    public async updateApOuiRule(
        ruleId: string,
        payload: z.input<typeof schemas.ouiBasedVlanApOpenApiVOSchema>,
        siteId?: string,
        h?: CustomHeaders
    ): Promise<unknown> {
        return await this.lanServiceOps.updateApOuiRule(ruleId, payload, siteId, h);
    }

    public async deleteApOuiRule(ruleId: string, siteId?: string, h?: CustomHeaders): Promise<unknown> {
        return await this.lanServiceOps.deleteApOuiRule(ruleId, siteId, h);
    }

    // ---- VPN reads and SSL VPN locked tunnels (VpnOperations) ----
    public async listSslVpnLockedTunnels(siteId?: string, h?: CustomHeaders): Promise<unknown[]> {
        return await this.vpnOps.listSslVpnLockedTunnels(siteId, h);
    }

    public async createSslVpnLockedTunnel(
        payload: z.input<typeof schemas.sslVpnLockCreateAndModifyOpenApiVOSchema>,
        siteId?: string,
        h?: CustomHeaders
    ): Promise<unknown> {
        return await this.vpnOps.createSslVpnLockedTunnel(payload, siteId, h);
    }

    public async updateSslVpnLockedTunnel(
        lockTunnelId: string,
        payload: z.input<typeof schemas.sslVpnLockCreateAndModifyOpenApiVOSchema>,
        siteId?: string,
        h?: CustomHeaders
    ): Promise<unknown> {
        return await this.vpnOps.updateSslVpnLockedTunnel(lockTunnelId, payload, siteId, h);
    }

    public async deleteSslVpnLockedTunnel(lockTunnelId: string, siteId?: string, h?: CustomHeaders): Promise<unknown> {
        return await this.vpnOps.deleteSslVpnLockedTunnel(lockTunnelId, siteId, h);
    }

    public async deleteSslVpnLockedTunnels(lockTunnelIds: string[], siteId?: string, h?: CustomHeaders): Promise<unknown> {
        return await this.vpnOps.deleteSslVpnLockedTunnels(lockTunnelIds, siteId, h);
    }

    public async getSiteToSiteVpn(vpnId: string, siteId?: string, h?: CustomHeaders): Promise<unknown> {
        return await this.vpnOps.getSiteToSiteVpn(vpnId, siteId, h);
    }

    public async getClientToSiteVpnServer(vpnId: string, siteId?: string, h?: CustomHeaders): Promise<unknown> {
        return await this.vpnOps.getClientToSiteVpnServer(vpnId, siteId, h);
    }

    public async getClientToSiteVpnClient(vpnId: string, siteId?: string, h?: CustomHeaders): Promise<unknown> {
        return await this.vpnOps.getClientToSiteVpnClient(vpnId, siteId, h);
    }

    public async listSiteToSiteVpnSummaries(siteId?: string, h?: CustomHeaders): Promise<unknown[]> {
        return await this.vpnOps.listSiteToSiteVpnSummaries(siteId, h);
    }

    public async listVpnServerSummaries(siteId?: string, h?: CustomHeaders): Promise<unknown[]> {
        return await this.vpnOps.listVpnServerSummaries(siteId, h);
    }

    public async listVpnClientSummaries(siteId?: string, h?: CustomHeaders): Promise<unknown[]> {
        return await this.vpnOps.listVpnClientSummaries(siteId, h);
    }

    public async checkVpnUsage(vpnId: string, siteId?: string, h?: CustomHeaders): Promise<unknown> {
        return await this.vpnOps.checkVpnUsage(vpnId, siteId, h);
    }

    public async listVpnIpPools(siteId?: string, h?: CustomHeaders): Promise<unknown> {
        return await this.vpnOps.listVpnIpPools(siteId, h);
    }

    public async listVpnServersForUsers(siteId?: string, h?: CustomHeaders): Promise<unknown> {
        return await this.vpnOps.listVpnServersForUsers(siteId, h);
    }

    public async listVpnUsersByProtocol(protocol: number, siteId?: string, h?: CustomHeaders): Promise<unknown> {
        return await this.vpnOps.listVpnUsersByProtocol(protocol, siteId, h);
    }

    public async listVpnServerUserNames(serverId: string, siteId?: string, h?: CustomHeaders): Promise<unknown> {
        return await this.vpnOps.listVpnServerUserNames(serverId, siteId, h);
    }

    public async listVpnServerUsers(vpnId: string, siteId?: string, h?: CustomHeaders): Promise<unknown[]> {
        return await this.vpnOps.listVpnServerUsers(vpnId, siteId, h);
    }

    public async listVpnBriefUserGroups(siteId?: string, h?: CustomHeaders): Promise<unknown[]> {
        return await this.vpnOps.listVpnBriefUserGroups(siteId, h);
    }

    public async listSslVpnBriefUserGroups(siteId?: string, h?: CustomHeaders): Promise<unknown> {
        return await this.vpnOps.listSslVpnBriefUserGroups(siteId, h);
    }

    public async listSslVpnBriefResources(siteId?: string, h?: CustomHeaders): Promise<unknown> {
        return await this.vpnOps.listSslVpnBriefResources(siteId, h);
    }

    public async listSslVpnBriefResourceGroups(siteId?: string, h?: CustomHeaders): Promise<unknown> {
        return await this.vpnOps.listSslVpnBriefResourceGroups(siteId, h);
    }

    public async listSslVpnRadiusProfiles(siteId?: string, h?: CustomHeaders): Promise<unknown> {
        return await this.vpnOps.listSslVpnRadiusProfiles(siteId, h);
    }

    // ---- Site service settings (ServiceSettingOperations) ----
    public async setSessionLimit(payload: z.input<typeof schemas.sessionLimitEntitySchema>, siteId?: string, h?: CustomHeaders): Promise<unknown> {
        return await this.serviceSettingOps.setSessionLimit(payload, siteId, h);
    }

    public async createSessionLimitRule(
        payload: z.input<typeof schemas.sessionLimitRuleOpenApiVOSchema>,
        siteId?: string,
        h?: CustomHeaders
    ): Promise<unknown> {
        return await this.serviceSettingOps.createSessionLimitRule(payload, siteId, h);
    }

    public async updateSessionLimitRule(
        ruleId: string,
        payload: z.input<typeof schemas.sessionLimitRuleOpenApiVOSchema>,
        siteId?: string,
        h?: CustomHeaders
    ): Promise<unknown> {
        return await this.serviceSettingOps.updateSessionLimitRule(ruleId, payload, siteId, h);
    }

    public async deleteSessionLimitRule(ruleId: string, siteId?: string, h?: CustomHeaders): Promise<unknown> {
        return await this.serviceSettingOps.deleteSessionLimitRule(ruleId, siteId, h);
    }

    public async reorderSessionLimitRules(indexes: Record<string, number>, siteId?: string, h?: CustomHeaders): Promise<unknown> {
        return await this.serviceSettingOps.reorderSessionLimitRules(indexes, siteId, h);
    }

    public async setBandwidthControl(payload: z.input<typeof schemas.bandwidthControlSchema>, siteId?: string, h?: CustomHeaders): Promise<unknown> {
        return await this.serviceSettingOps.setBandwidthControl(payload, siteId, h);
    }

    public async reorderBandwidthControlRules(indexes: Record<string, number>, siteId?: string, h?: CustomHeaders): Promise<unknown> {
        return await this.serviceSettingOps.reorderBandwidthControlRules(indexes, siteId, h);
    }

    public async reorderPolicyRoutes(indexes: Record<string, number>, siteId?: string, h?: CustomHeaders): Promise<unknown> {
        return await this.serviceSettingOps.reorderPolicyRoutes(indexes, siteId, h);
    }

    public async setLldpSetting(payload: z.input<typeof schemas.siteLldpSettingSchema>, siteId?: string, h?: CustomHeaders): Promise<unknown> {
        return await this.serviceSettingOps.setLldpSetting(payload, siteId, h);
    }

    public async getRemoteLoggingTip(siteId?: string, h?: CustomHeaders): Promise<unknown> {
        return await this.serviceSettingOps.getRemoteLoggingTip(siteId, h);
    }

    public async setSiteRemoteLogging(
        payload: z.input<typeof schemas.siteRemoteLoggingSettingSchema>,
        siteId?: string,
        h?: CustomHeaders
    ): Promise<unknown> {
        return await this.serviceSettingOps.setSiteRemoteLogging(payload, siteId, h);
    }

    public async setSshSetting(payload: z.input<typeof sshSettingPayloadSchema>, siteId?: string, h?: CustomHeaders): Promise<unknown> {
        return await this.serviceSettingOps.setSshSetting(payload, siteId, h);
    }

    public async listSnmpIncompatibleDevices(siteId?: string, h?: CustomHeaders): Promise<unknown[]> {
        return await this.serviceSettingOps.listSnmpIncompatibleDevices(siteId, h);
    }

    public async setMacAuthSetting(
        payload: z.input<typeof schemas.updateMacAuthOpenApiVOSchema>,
        siteId?: string,
        h?: CustomHeaders
    ): Promise<unknown> {
        return await this.serviceSettingOps.setMacAuthSetting(payload, siteId, h);
    }

    public async setMacFilteringGeneralSetting(
        payload: z.input<typeof schemas.macFilteringGeneralSettingSchema>,
        siteId?: string,
        h?: CustomHeaders
    ): Promise<unknown> {
        return await this.serviceSettingOps.setMacFilteringGeneralSetting(payload, siteId, h);
    }

    public async setEapDot1xSetting(payload: z.input<typeof schemas.dot1xEapOpenApiVOSchema>, siteId?: string, h?: CustomHeaders): Promise<unknown> {
        return await this.serviceSettingOps.setEapDot1xSetting(payload, siteId, h);
    }

    public async listEapDot1xCandidates(siteId?: string, h?: CustomHeaders): Promise<unknown> {
        return await this.serviceSettingOps.listEapDot1xCandidates(siteId, h);
    }

    public async listSwitchDot1xCandidates(siteId?: string, h?: CustomHeaders): Promise<unknown> {
        return await this.serviceSettingOps.listSwitchDot1xCandidates(siteId, h);
    }

    // ---- Topology, capture lookups and report order (TopologyOperations) ----
    public async getSiteTopology(siteId?: string, h?: CustomHeaders): Promise<unknown> {
        return await this.topologyOps.getSiteTopology(siteId, h);
    }

    public async getSiteTopologyByStatus(deviceStatus: '0' | '1' | '0,1', siteId?: string, h?: CustomHeaders): Promise<unknown> {
        return await this.topologyOps.getSiteTopologyByStatus(deviceStatus, siteId, h);
    }

    public async refreshTopology(siteId?: string, h?: CustomHeaders): Promise<unknown> {
        return await this.topologyOps.refreshTopology(siteId, h);
    }

    public async listTopologyNodes(siteId?: string, h?: CustomHeaders): Promise<unknown> {
        return await this.topologyOps.listTopologyNodes(siteId, h);
    }

    public async setTopologyRootNode(payload: z.input<typeof topologyRootNodeSchema>, siteId?: string, h?: CustomHeaders): Promise<unknown> {
        return await this.topologyOps.setTopologyRootNode(payload, siteId, h);
    }

    public async listTopologyClientsOfDevices(
        deviceMacs: string[],
        clientType: '0' | '1' | '0,1',
        siteId?: string,
        h?: CustomHeaders
    ): Promise<unknown> {
        return await this.topologyOps.listTopologyClientsOfDevices(deviceMacs, clientType, siteId, h);
    }

    public async listTopologyDeviceClients(deviceMac: string, siteId?: string, h?: CustomHeaders): Promise<unknown> {
        return await this.topologyOps.listTopologyDeviceClients(deviceMac, siteId, h);
    }

    public async listTopologyDeviceAllClients(
        deviceMac: string,
        clientType: '0' | '1' | '0,1',
        siteId?: string,
        h?: CustomHeaders
    ): Promise<unknown> {
        return await this.topologyOps.listTopologyDeviceAllClients(deviceMac, clientType, siteId, h);
    }

    public async getTopologyAvailableNetworks(siteId?: string, h?: CustomHeaders): Promise<unknown> {
        return await this.topologyOps.getTopologyAvailableNetworks(siteId, h);
    }

    public async getTopologyAvailableVlans(siteId?: string, h?: CustomHeaders): Promise<unknown> {
        return await this.topologyOps.getTopologyAvailableVlans(siteId, h);
    }

    public async listTopologyAvailableSsids(searchKey: string, siteId?: string, h?: CustomHeaders): Promise<unknown[]> {
        return await this.topologyOps.listTopologyAvailableSsids(searchKey, siteId, h);
    }

    public async getTopologyDiscoveryStatus(siteId?: string, h?: CustomHeaders): Promise<unknown> {
        return await this.topologyOps.getTopologyDiscoveryStatus(siteId, h);
    }

    public async listTopologyIsolatedDevices(siteId?: string, h?: CustomHeaders): Promise<unknown> {
        return await this.topologyOps.listTopologyIsolatedDevices(siteId, h);
    }

    public async searchTopology(searchKey: string, siteId?: string, h?: CustomHeaders): Promise<unknown[]> {
        return await this.topologyOps.searchTopology(searchKey, siteId, h);
    }

    public async listTopologyVlanDevices(networkId: string, vlan: number, siteId?: string, h?: CustomHeaders): Promise<unknown> {
        return await this.topologyOps.listTopologyVlanDevices(networkId, vlan, siteId, h);
    }

    public async listTopologySsidDevices(ssidId: string, siteId?: string, h?: CustomHeaders): Promise<unknown> {
        return await this.topologyOps.listTopologySsidDevices(ssidId, siteId, h);
    }

    public async listCaptureCapableDevices(
        deviceType: z.input<typeof captureDeviceTypeSchema>,
        siteId?: string,
        h?: CustomHeaders
    ): Promise<unknown[]> {
        return await this.topologyOps.listCaptureCapableDevices(deviceType, siteId, h);
    }

    public async listCaptureInterfaces(
        deviceType: z.input<typeof captureDeviceTypeSchema>,
        deviceMac: string,
        siteId?: string,
        h?: CustomHeaders
    ): Promise<unknown> {
        return await this.topologyOps.listCaptureInterfaces(deviceType, deviceMac, siteId, h);
    }

    public async getCaptureStatus(
        deviceType: z.input<typeof captureDeviceTypeSchema>,
        deviceMac: string,
        requestId: string,
        siteId?: string,
        h?: CustomHeaders
    ): Promise<unknown> {
        return await this.topologyOps.getCaptureStatus(deviceType, deviceMac, requestId, siteId, h);
    }

    public async getLastCaptureDevice(siteId?: string, h?: CustomHeaders): Promise<unknown> {
        return await this.topologyOps.getLastCaptureDevice(siteId, h);
    }

    public async getReportEmailSchedule(siteId?: string, h?: CustomHeaders): Promise<unknown> {
        return await this.topologyOps.getReportEmailSchedule(siteId, h);
    }

    public async reorderReportTabs(tabs: ReportTabRecord[], siteId?: string, h?: CustomHeaders): Promise<unknown> {
        return await this.topologyOps.reorderReportTabs(tabs, siteId, h);
    }

    public async getMultiSiteTopology(siteIds: string[], h?: CustomHeaders): Promise<unknown> {
        return await this.topologyOps.getMultiSiteTopology(siteIds, h);
    }

    // ---- Portals, PPSK profiles and reboot schedule list (PortalOperations) ----
    public async getPortal(portalId: string, siteId?: string, h?: CustomHeaders): Promise<unknown> {
        return await this.portalOps.getPortal(portalId, siteId, h);
    }

    public async getPortalCustomization(portalId: string, siteId?: string, h?: CustomHeaders): Promise<unknown> {
        return await this.portalOps.getPortalCustomization(portalId, siteId, h);
    }

    public async getPortalDomain(siteId?: string, h?: CustomHeaders): Promise<unknown> {
        return await this.portalOps.getPortalDomain(siteId, h);
    }

    public async createPortal(payload: z.input<typeof schemas.portalSettingSchema>, siteId?: string, h?: CustomHeaders): Promise<unknown> {
        return await this.portalOps.createPortal(payload, siteId, h);
    }

    public async updatePortal(
        portalId: string,
        payload: z.input<typeof schemas.portalSettingSchema>,
        siteId?: string,
        h?: CustomHeaders
    ): Promise<unknown> {
        return await this.portalOps.updatePortal(portalId, payload, siteId, h);
    }

    public async deletePortal(portalId: string, siteId?: string, h?: CustomHeaders): Promise<unknown> {
        return await this.portalOps.deletePortal(portalId, siteId, h);
    }

    public async createPpskProfile(payload: z.input<typeof schemas.ppskProfileV2Schema>, siteId?: string, h?: CustomHeaders): Promise<unknown> {
        return await this.portalOps.createPpskProfile(payload, siteId, h);
    }

    public async updatePpskProfile(
        profileId: string,
        payload: z.input<typeof schemas.ppskProfileSchema>,
        siteId?: string,
        h?: CustomHeaders
    ): Promise<unknown> {
        return await this.portalOps.updatePpskProfile(profileId, payload, siteId, h);
    }

    public async deletePpskProfile(profileId: string, siteId?: string, h?: CustomHeaders): Promise<unknown> {
        return await this.portalOps.deletePpskProfile(profileId, siteId, h);
    }

    public async addPpskEntries(
        profileId: string,
        payload: z.input<typeof schemas.addPSKsOpenApiVOSchema>,
        siteId?: string,
        h?: CustomHeaders
    ): Promise<unknown> {
        return await this.portalOps.addPpskEntries(profileId, payload, siteId, h);
    }

    public async deletePpskEntries(profileId: string, names: string[], siteId?: string, h?: CustomHeaders): Promise<unknown> {
        return await this.portalOps.deletePpskEntries(profileId, names, siteId, h);
    }

    public async listRebootSchedules(siteId?: string, h?: CustomHeaders): Promise<unknown> {
        return await this.portalOps.listRebootSchedules(siteId, h);
    }

    // ---- Firewall maintenance (FirewallMaintenanceOperations) ----
    public async resetFirewallSetting(siteId?: string, h?: CustomHeaders): Promise<unknown> {
        return await this.firewallMaintenanceOps.resetFirewallSetting(siteId, h);
    }

    public async getAttackDefenseDefaults(siteId?: string, h?: CustomHeaders): Promise<unknown> {
        return await this.firewallMaintenanceOps.getAttackDefenseDefaults(siteId, h);
    }

    public async resetAttackDefenseSetting(siteId?: string, h?: CustomHeaders): Promise<unknown> {
        return await this.firewallMaintenanceOps.resetAttackDefenseSetting(siteId, h);
    }

    public async listUrlFilterCategories(siteId?: string, h?: CustomHeaders): Promise<unknown> {
        return await this.firewallMaintenanceOps.listUrlFilterCategories(siteId, h);
    }

    public async setUrlFilterGlobalSetting(
        payload: z.input<typeof schemas.urlFilterGlobalOpenApiVOSchema>,
        siteId?: string,
        h?: CustomHeaders
    ): Promise<unknown> {
        return await this.firewallMaintenanceOps.setUrlFilterGlobalSetting(payload, siteId, h);
    }

    public async reorderUrlFilterRules(
        type: z.input<typeof urlFilterOrderTypeSchema>,
        indexes: Record<string, number>,
        siteId?: string,
        h?: CustomHeaders
    ): Promise<unknown> {
        return await this.firewallMaintenanceOps.reorderUrlFilterRules(type, indexes, siteId, h);
    }

    public async reorderAcls(
        type: z.input<typeof aclOrderTypeSchema>,
        indexes: Record<string, number>,
        siteId?: string,
        h?: CustomHeaders
    ): Promise<unknown> {
        return await this.firewallMaintenanceOps.reorderAcls(type, indexes, siteId, h);
    }

    public async clearGatewayAclHitCounts(siteId?: string, h?: CustomHeaders): Promise<unknown> {
        return await this.firewallMaintenanceOps.clearGatewayAclHitCounts(siteId, h);
    }

    public async updateGatewayCustomAcls(
        changes: z.input<typeof gatewayCustomAclChangesSchema>,
        siteId?: string,
        h?: CustomHeaders
    ): Promise<unknown> {
        return await this.firewallMaintenanceOps.updateGatewayCustomAcls(changes, siteId, h);
    }

    public async reorderGatewayCustomAcls(indexes: Record<string, number>, siteId?: string, h?: CustomHeaders): Promise<unknown> {
        return await this.firewallMaintenanceOps.reorderGatewayCustomAcls(indexes, siteId, h);
    }

    public async clearGatewayCustomAclHitCounts(siteId?: string, h?: CustomHeaders): Promise<unknown> {
        return await this.firewallMaintenanceOps.clearGatewayCustomAclHitCounts(siteId, h);
    }

    public async setGatewayCustomAclsState(ids: string[], status: 0 | 1 | 2, log: 0 | 1 | 2, siteId?: string, h?: CustomHeaders): Promise<unknown> {
        return await this.firewallMaintenanceOps.setGatewayCustomAclsState(ids, status, log, siteId, h);
    }

    public async deleteGatewayCustomAcls(ids: string[], siteId?: string, h?: CustomHeaders): Promise<unknown> {
        return await this.firewallMaintenanceOps.deleteGatewayCustomAcls(ids, siteId, h);
    }

    // ---- Network security (NetworkSecurityOperations) ----
    public async getWirelessIdsConfig(siteId?: string, h?: CustomHeaders): Promise<unknown> {
        return await this.networkSecurityOps.getWirelessIdsConfig(siteId, h);
    }

    public async setWirelessIdsConfig(
        payload: z.input<typeof schemas.updateWidsConfigOpenApiVOSchema>,
        siteId?: string,
        h?: CustomHeaders
    ): Promise<unknown> {
        return await this.networkSecurityOps.setWirelessIdsConfig(payload, siteId, h);
    }

    public async getWirelessIpsConfig(siteId?: string, h?: CustomHeaders): Promise<unknown> {
        return await this.networkSecurityOps.getWirelessIpsConfig(siteId, h);
    }

    public async setWirelessIpsConfig(
        payload: z.input<typeof schemas.updateWipsConfigOpenApiVOSchema>,
        siteId?: string,
        h?: CustomHeaders
    ): Promise<unknown> {
        return await this.networkSecurityOps.setWirelessIpsConfig(payload, siteId, h);
    }

    public async createIpsAllowEntry(
        payload: z.input<typeof schemas.newIPSAllowListEntrySchema>,
        siteId?: string,
        h?: CustomHeaders
    ): Promise<unknown> {
        return await this.networkSecurityOps.createIpsAllowEntry(payload, siteId, h);
    }

    public async updateIpsAllowEntry(
        payload: z.input<typeof schemas.modifyIPSAllowListEntrySchema>,
        siteId?: string,
        h?: CustomHeaders
    ): Promise<unknown> {
        return await this.networkSecurityOps.updateIpsAllowEntry(payload, siteId, h);
    }

    public async deleteIpsAllowEntry(entryId: string, siteId?: string, h?: CustomHeaders): Promise<unknown> {
        return await this.networkSecurityOps.deleteIpsAllowEntry(entryId, siteId, h);
    }

    public async deleteIpsBlockEntry(entryId: string, siteId?: string, h?: CustomHeaders): Promise<unknown> {
        return await this.networkSecurityOps.deleteIpsBlockEntry(entryId, siteId, h);
    }

    public async updateIpsSignature(
        signId: string,
        payload: z.input<typeof schemas.ipsSignatureConfigSchema>,
        siteId?: string,
        h?: CustomHeaders
    ): Promise<unknown> {
        return await this.networkSecurityOps.updateIpsSignature(signId, payload, siteId, h);
    }

    public async deleteIpsSignature(signId: string, siteId?: string, h?: CustomHeaders): Promise<unknown> {
        return await this.networkSecurityOps.deleteIpsSignature(signId, siteId, h);
    }

    // ---- Controller-wide threats and blocked countries (GlobalSecurityOperations) ----
    public async getThreatMap(query: z.input<typeof schemas.queryThreatMapOpenApiVO22Schema>, h?: CustomHeaders): Promise<unknown> {
        return await this.globalSecurityOps.getThreatMap(query, h);
    }

    public async getThreatCategoryCounts(query: z.input<typeof schemas.queryThreatMapOpenApiVO22Schema>, h?: CustomHeaders): Promise<unknown> {
        return await this.globalSecurityOps.getThreatCategoryCounts(query, h);
    }

    public async listCountryThreats(query: z.input<typeof schemas.queryCountryThreatListOpenApiVO22Schema>, h?: CustomHeaders): Promise<unknown> {
        return await this.globalSecurityOps.listCountryThreats(query, h);
    }

    public async listBlockedCountries(siteIds?: string[], h?: CustomHeaders): Promise<unknown> {
        return await this.globalSecurityOps.listBlockedCountries(siteIds, h);
    }

    public async blockCountry(country: string, siteIds: string[], h?: CustomHeaders): Promise<unknown> {
        return await this.globalSecurityOps.blockCountry(country, siteIds, h);
    }

    public async unblockCountry(country: string, siteIds: string[], h?: CustomHeaders): Promise<unknown> {
        return await this.globalSecurityOps.unblockCountry(country, siteIds, h);
    }

    // ---- RADIUS/LDAP profiles and built-in RADIUS users (AuthProfileOperations) ----
    public async createRadiusProfile(
        payload: z.input<typeof schemas.createRadiusProfileOpenApiVOSchema>,
        siteId?: string,
        h?: CustomHeaders
    ): Promise<unknown> {
        return await this.authProfileOps.createRadiusProfile(payload, siteId, h);
    }

    public async updateRadiusProfile(
        radiusProfileId: string,
        payload: z.input<typeof schemas.createRadiusProfileOpenApiVOSchema>,
        siteId?: string,
        h?: CustomHeaders
    ): Promise<unknown> {
        return await this.authProfileOps.updateRadiusProfile(radiusProfileId, payload, siteId, h);
    }

    public async deleteRadiusProfile(radiusProfileId: string, siteId?: string, h?: CustomHeaders): Promise<unknown> {
        return await this.authProfileOps.deleteRadiusProfile(radiusProfileId, siteId, h);
    }

    public async createLdapProfile(
        payload: z.input<typeof schemas.createLdapProfileOpenApiVOSchema>,
        siteId?: string,
        h?: CustomHeaders
    ): Promise<unknown> {
        return await this.authProfileOps.createLdapProfile(payload, siteId, h);
    }

    public async updateLdapProfile(
        ldapProfileId: string,
        payload: z.input<typeof schemas.createLdapProfileOpenApiVOSchema>,
        siteId?: string,
        h?: CustomHeaders
    ): Promise<unknown> {
        return await this.authProfileOps.updateLdapProfile(ldapProfileId, payload, siteId, h);
    }

    public async deleteLdapProfile(ldapProfileId: string, siteId?: string, h?: CustomHeaders): Promise<unknown> {
        return await this.authProfileOps.deleteLdapProfile(ldapProfileId, siteId, h);
    }

    public async createRadiusUser(
        payload: z.input<typeof schemas.createRadiusUserOpenApiVOSchema>,
        siteId?: string,
        h?: CustomHeaders
    ): Promise<unknown> {
        return await this.authProfileOps.createRadiusUser(payload, siteId, h);
    }

    public async updateRadiusUser(
        userId: string,
        payload: z.input<typeof schemas.createRadiusUserOpenApiVOSchema>,
        siteId?: string,
        h?: CustomHeaders
    ): Promise<unknown> {
        return await this.authProfileOps.updateRadiusUser(userId, payload, siteId, h);
    }

    public async deleteRadiusUser(userId: string, siteId?: string, h?: CustomHeaders): Promise<unknown> {
        return await this.authProfileOps.deleteRadiusUser(userId, siteId, h);
    }

    // ---- SSIDs by ID and AP groups (WirelessOperations) ----
    public async getSsidConfig(ssidId: string, siteId?: string, h?: CustomHeaders): Promise<unknown> {
        return await this.wirelessOps.getSsidConfig(ssidId, siteId, h);
    }

    public async listDuplicateSsidNames(siteId?: string, h?: CustomHeaders): Promise<unknown> {
        return await this.wirelessOps.listDuplicateSsidNames(siteId, h);
    }

    public async listSsidApGroups(ssidId: string, siteId?: string, h?: CustomHeaders): Promise<unknown> {
        return await this.wirelessOps.listSsidApGroups(ssidId, siteId, h);
    }

    public async setSsidApGroups(ssidId: string, apGroupIds: string[], siteId?: string, h?: CustomHeaders): Promise<unknown> {
        return await this.wirelessOps.setSsidApGroups(ssidId, apGroupIds, siteId, h);
    }

    public async setSsidSection(
        ssidId: string,
        section: Exclude<SsidSection, 'rate-control'>,
        payload: Record<string, unknown>,
        siteId?: string,
        h?: CustomHeaders
    ): Promise<unknown> {
        return await this.wirelessOps.setSsidSection(ssidId, section, payload as never, siteId, h);
    }

    public async setSsidRateControl(
        wlanId: string,
        ssidId: string,
        payload: z.input<typeof schemas.updateSsidRateControlOpenApiVOSchema>,
        siteId?: string,
        h?: CustomHeaders
    ): Promise<unknown> {
        return await this.wirelessOps.setSsidRateControl(wlanId, ssidId, payload, siteId, h);
    }

    public async listApGroups(siteId?: string, h?: CustomHeaders): Promise<unknown[]> {
        return await this.wirelessOps.listApGroups(siteId, h);
    }

    public async getApGroup(apGroupId: string, siteId?: string, h?: CustomHeaders): Promise<unknown> {
        return await this.wirelessOps.getApGroup(apGroupId, siteId, h);
    }

    public async listApGroupAps(siteId?: string, h?: CustomHeaders): Promise<unknown[]> {
        return await this.wirelessOps.listApGroupAps(siteId, h);
    }

    public async getApGroupCount(siteId?: string, h?: CustomHeaders): Promise<unknown> {
        return await this.wirelessOps.getApGroupCount(siteId, h);
    }

    public async createApGroup(payload: z.input<typeof schemas.createApGroupOpenApiVOSchema>, siteId?: string, h?: CustomHeaders): Promise<unknown> {
        return await this.wirelessOps.createApGroup(payload, siteId, h);
    }

    public async updateApGroup(
        apGroupId: string,
        payload: z.input<typeof schemas.updateApGroupOpenApiVOSchema>,
        siteId?: string,
        h?: CustomHeaders
    ): Promise<unknown> {
        return await this.wirelessOps.updateApGroup(apGroupId, payload, siteId, h);
    }

    public async deleteApGroup(apGroupId: string, siteId?: string, h?: CustomHeaders): Promise<unknown> {
        return await this.wirelessOps.deleteApGroup(apGroupId, siteId, h);
    }

    // ---- Site services and settings (SiteServiceOperations) ----
    public async createPoeSchedule(payload: z.input<typeof poeSchedulePayloadSchema>, siteId?: string, h?: CustomHeaders): Promise<unknown> {
        return await this.siteServiceOps.createPoeSchedule(payload, siteId, h);
    }

    public async updatePoeSchedule(
        poeScheduleId: string,
        payload: z.input<typeof poeSchedulePayloadSchema>,
        siteId?: string,
        h?: CustomHeaders
    ): Promise<unknown> {
        return await this.siteServiceOps.updatePoeSchedule(poeScheduleId, payload, siteId, h);
    }

    public async deletePoeSchedule(poeScheduleId: string, siteId?: string, h?: CustomHeaders): Promise<unknown> {
        return await this.siteServiceOps.deletePoeSchedule(poeScheduleId, siteId, h);
    }

    public async createIpMacBinding(payload: z.input<typeof ipMacBindingPayloadSchema>, siteId?: string, h?: CustomHeaders): Promise<unknown> {
        return await this.siteServiceOps.createIpMacBinding(payload, siteId, h);
    }

    public async updateIpMacBinding(
        bindId: string,
        payload: z.input<typeof ipMacBindingPayloadSchema>,
        siteId?: string,
        h?: CustomHeaders
    ): Promise<unknown> {
        return await this.siteServiceOps.updateIpMacBinding(bindId, payload, siteId, h);
    }

    public async deleteIpMacBinding(bindId: string, siteId?: string, h?: CustomHeaders): Promise<unknown> {
        return await this.siteServiceOps.deleteIpMacBinding(bindId, siteId, h);
    }

    public async listIotServers(siteId?: string, h?: CustomHeaders): Promise<unknown[]> {
        return await this.siteServiceOps.listIotServers(siteId, h);
    }

    public async createIotServer(
        payload: z.input<typeof schemas.configIotServerOpenApiVOSchema>,
        siteId?: string,
        h?: CustomHeaders
    ): Promise<unknown> {
        return await this.siteServiceOps.createIotServer(payload, siteId, h);
    }

    public async updateIotServer(
        id: string,
        payload: z.input<typeof schemas.configIotServerOpenApiVOSchema>,
        siteId?: string,
        h?: CustomHeaders
    ): Promise<unknown> {
        return await this.siteServiceOps.updateIotServer(id, payload, siteId, h);
    }

    public async deleteIotServer(id: string, siteId?: string, h?: CustomHeaders): Promise<unknown> {
        return await this.siteServiceOps.deleteIotServer(id, siteId, h);
    }

    public async getSiteMailServer(siteId?: string, h?: CustomHeaders): Promise<unknown> {
        return await this.siteServiceOps.getSiteMailServer(siteId, h);
    }

    public async createSiteMailServer(payload: z.input<typeof mailServerPayloadSchema>, siteId?: string, h?: CustomHeaders): Promise<unknown> {
        return await this.siteServiceOps.createSiteMailServer(payload, siteId, h);
    }

    public async updateSiteMailServer(
        mailId: string,
        payload: z.input<typeof mailServerPayloadSchema>,
        siteId?: string,
        h?: CustomHeaders
    ): Promise<unknown> {
        return await this.siteServiceOps.updateSiteMailServer(mailId, payload, siteId, h);
    }

    public async setSiteLed(payload: z.input<typeof schemas.siteLedSettingSchema>, siteId?: string, h?: CustomHeaders): Promise<unknown> {
        return await this.siteServiceOps.setSiteLed(payload, siteId, h);
    }

    public async setMulticastRateLimit(
        payload: z.input<typeof schemas.siteMulticastRateLimitSettingSchema>,
        siteId?: string,
        h?: CustomHeaders
    ): Promise<unknown> {
        return await this.siteServiceOps.setMulticastRateLimit(payload, siteId, h);
    }

    public async setSiteRememberSetting(
        payload: z.input<typeof schemas.siteRememberDeviceSettingSchema>,
        siteId?: string,
        h?: CustomHeaders
    ): Promise<unknown> {
        return await this.siteServiceOps.setSiteRememberSetting(payload, siteId, h);
    }

    public async getMldSetting(siteId?: string, h?: CustomHeaders): Promise<unknown> {
        return await this.siteServiceOps.getMldSetting(siteId, h);
    }

    public async getSpeedTestSetting(siteId?: string, h?: CustomHeaders): Promise<unknown> {
        return await this.siteServiceOps.getSpeedTestSetting(siteId, h);
    }

    public async setSpeedTestSetting(
        payload: z.input<typeof schemas.modifySpeedTestV2SettingOpenApiVOSchema>,
        siteId?: string,
        h?: CustomHeaders
    ): Promise<unknown> {
        return await this.siteServiceOps.setSpeedTestSetting(payload, siteId, h);
    }

    public async getPortalLogoutSetting(siteId?: string, h?: CustomHeaders): Promise<unknown> {
        return await this.siteServiceOps.getPortalLogoutSetting(siteId, h);
    }

    public async setPortalLogoutSetting(
        payload: z.input<typeof schemas.portalLogoutConfigOpenApiVOSchema>,
        siteId?: string,
        h?: CustomHeaders
    ): Promise<unknown> {
        return await this.siteServiceOps.setPortalLogoutSetting(payload, siteId, h);
    }

    public async listPortalsWithLogout(siteId?: string, h?: CustomHeaders): Promise<unknown> {
        return await this.siteServiceOps.listPortalsWithLogout(siteId, h);
    }

    public async getIotRadioSetting(siteId?: string, h?: CustomHeaders): Promise<unknown> {
        return await this.siteServiceOps.getIotRadioSetting(siteId, h);
    }

    public async setIotRadioSetting(payload: z.input<typeof iotRadioPayloadSchema>, siteId?: string, h?: CustomHeaders): Promise<unknown> {
        return await this.siteServiceOps.setIotRadioSetting(payload, siteId, h);
    }

    public async getIntelliRecoverSetting(siteId?: string, h?: CustomHeaders): Promise<unknown> {
        return await this.siteServiceOps.getIntelliRecoverSetting(siteId, h);
    }

    public async setIntelliRecoverSetting(
        payload: z.input<typeof intelliRecoverPayloadSchema>,
        siteId?: string,
        h?: CustomHeaders
    ): Promise<unknown> {
        return await this.siteServiceOps.setIntelliRecoverSetting(payload, siteId, h);
    }

    // ---- Site administration (SiteAdminOperations) ----
    public async createSite(payload: z.input<typeof schemas.createSiteEntity02Schema>, h?: CustomHeaders): Promise<unknown> {
        return await this.siteAdminOps.createSite(payload, h);
    }

    public async updateSite(siteId: string, payload: z.input<typeof schemas.updateSiteEntity02Schema>, h?: CustomHeaders): Promise<unknown> {
        return await this.siteAdminOps.updateSite(siteId, payload, h);
    }

    public async deleteSite(siteId: string, h?: CustomHeaders): Promise<unknown> {
        return await this.siteAdminOps.deleteSite(siteId, h);
    }

    public async listSiteTags(h?: CustomHeaders): Promise<unknown> {
        return await this.siteAdminOps.listSiteTags(h);
    }

    public async createSiteTag(payload: z.input<typeof schemas.createSiteTagOpenApiVO02Schema>, h?: CustomHeaders): Promise<unknown> {
        return await this.siteAdminOps.createSiteTag(payload, h);
    }

    public async updateSiteTag(tagId: string, name: string, h?: CustomHeaders): Promise<unknown> {
        return await this.siteAdminOps.updateSiteTag(tagId, name, h);
    }

    public async deleteSiteTag(tagId: string, h?: CustomHeaders): Promise<unknown> {
        return await this.siteAdminOps.deleteSiteTag(tagId, h);
    }

    public async listScenarios(h?: CustomHeaders): Promise<unknown> {
        return await this.siteAdminOps.listScenarios(h);
    }

    public async createScenario(name: string, h?: CustomHeaders): Promise<unknown> {
        return await this.siteAdminOps.createScenario(name, h);
    }

    public async deleteScenario(name: string, h?: CustomHeaders): Promise<unknown> {
        return await this.siteAdminOps.deleteScenario(name, h);
    }

    public async listPlacedSitePositions(h?: CustomHeaders): Promise<unknown> {
        return await this.siteAdminOps.listPlacedSitePositions(h);
    }

    public async listUnplacedSitePositions(page: number, pageSize: number, searchKey?: string, h?: CustomHeaders): Promise<unknown> {
        return await this.siteAdminOps.listUnplacedSitePositions(page, pageSize, searchKey, h);
    }

    public async getSiteOverrides(siteIds: string[], h?: CustomHeaders): Promise<unknown> {
        return await this.siteAdminOps.getSiteOverrides(siteIds, h);
    }

    public async getSiteHealthOverview(siteId?: string, h?: CustomHeaders): Promise<unknown> {
        return await this.siteAdminOps.getSiteHealthOverview(siteId, h);
    }

    public async getSiteJumbo(siteId?: string, h?: CustomHeaders): Promise<unknown> {
        return await this.siteAdminOps.getSiteJumbo(siteId, h);
    }

    public async setSiteJumbo(payload: z.input<typeof schemas.siteJumboOpenApiVOSchema>, siteId?: string, h?: CustomHeaders): Promise<unknown> {
        return await this.siteAdminOps.setSiteJumbo(payload, siteId, h);
    }

    public async getSiteLagHashAlgorithm(siteId?: string, h?: CustomHeaders): Promise<unknown> {
        return await this.siteAdminOps.getSiteLagHashAlgorithm(siteId, h);
    }

    public async setSiteLagHashAlgorithm(
        payload: z.input<typeof schemas.siteLagHashAlgOpenApiVOSchema>,
        siteId?: string,
        h?: CustomHeaders
    ): Promise<unknown> {
        return await this.siteAdminOps.setSiteLagHashAlgorithm(payload, siteId, h);
    }

    public async setSiteDeviceAccount(
        payload: z.input<typeof schemas.deviceAccountSettingOpenApiVO02Schema>,
        siteId?: string,
        h?: CustomHeaders
    ): Promise<unknown> {
        return await this.siteAdminOps.setSiteDeviceAccount(payload, siteId, h);
    }

    /** The site ID configured with OMADA_SITE_ID, if any. */
    public configuredSiteId(): string | undefined {
        return this.siteOps.configuredSiteId();
    }

    // ---- Controller settings (ControllerSettingOperations) ----
    public async setClientActiveTimeout(payload: z.input<typeof schemas.clientActiveTimeout21Schema>, h?: CustomHeaders): Promise<unknown> {
        return await this.controllerSettingOps.setClientActiveTimeout(payload, h);
    }

    public async setControllerRetention(payload: z.input<typeof controllerRetentionPayloadSchema>, h?: CustomHeaders): Promise<unknown> {
        return await this.controllerSettingOps.setControllerRetention(payload, h);
    }

    public async setDataRetention(payload: z.input<typeof dataRetentionPayloadSchema>, h?: CustomHeaders): Promise<unknown> {
        return await this.controllerSettingOps.setDataRetention(payload, h);
    }

    public async setDeviceAccessManagement(payload: z.input<typeof schemas.deviceAccessManagementVO21Schema>, h?: CustomHeaders): Promise<unknown> {
        return await this.controllerSettingOps.setDeviceAccessManagement(payload, h);
    }

    public async setUiInterface(payload: z.input<typeof schemas.uIInterface21Schema>, h?: CustomHeaders): Promise<unknown> {
        return await this.controllerSettingOps.setUiInterface(payload, h);
    }

    public async setExperienceImprovement(
        payload: z.input<typeof schemas.experienceImprovementProgram21Schema>,
        h?: CustomHeaders
    ): Promise<unknown> {
        return await this.controllerSettingOps.setExperienceImprovement(payload, h);
    }

    public async setGeneralSettings(payload: z.input<typeof generalSettingsPayloadSchema>, h?: CustomHeaders): Promise<unknown> {
        return await this.controllerSettingOps.setGeneralSettings(payload, h);
    }

    public async setRadiusServer(payload: z.input<typeof schemas.builtInRADIUSServerConfigRequestBody21Schema>, h?: CustomHeaders): Promise<unknown> {
        return await this.controllerSettingOps.setRadiusServer(payload, h);
    }

    public async setRadiusProxy(payload: z.input<typeof radiusProxyPayloadSchema>, h?: CustomHeaders): Promise<unknown> {
        return await this.controllerSettingOps.setRadiusProxy(payload, h);
    }

    public async setRemoteLogging(payload: z.input<typeof remoteLoggingPayloadSchema>, h?: CustomHeaders): Promise<unknown> {
        return await this.controllerSettingOps.setRemoteLogging(payload, h);
    }

    public async setControllerLogging(payload: z.input<typeof controllerLoggingPayloadSchema>, h?: CustomHeaders): Promise<unknown> {
        return await this.controllerSettingOps.setControllerLogging(payload, h);
    }

    public async getClientRecognition(h?: CustomHeaders): Promise<unknown> {
        return await this.controllerSettingOps.getClientRecognition(h);
    }

    public async setClientRecognition(
        payload: z.input<typeof schemas.clientRecognitionEnableOpenApiVO21Schema>,
        h?: CustomHeaders
    ): Promise<unknown> {
        return await this.controllerSettingOps.setClientRecognition(payload, h);
    }

    public async getClientDetailInformation(h?: CustomHeaders): Promise<unknown> {
        return await this.controllerSettingOps.getClientDetailInformation(h);
    }

    public async setClientDetailInformation(payload: z.input<typeof clientDetailPayloadSchema>, h?: CustomHeaders): Promise<unknown> {
        return await this.controllerSettingOps.setClientDetailInformation(payload, h);
    }

    public async getControllerDstInfo(h?: CustomHeaders): Promise<unknown> {
        return await this.controllerSettingOps.getControllerDstInfo(h);
    }

    public async getSiteDstInfo(siteId?: string, h?: CustomHeaders): Promise<unknown> {
        return await this.controllerSettingOps.getSiteDstInfo(siteId, h);
    }

    public async getPrivacyPolicyStatus(h?: CustomHeaders): Promise<unknown> {
        return await this.controllerSettingOps.getPrivacyPolicyStatus(h);
    }

    public async getUpgradePort(h?: CustomHeaders): Promise<unknown> {
        return await this.controllerSettingOps.getUpgradePort(h);
    }

    public async listGlobalGatewayWanStatus(page: number, pageSize: number, h?: CustomHeaders): Promise<unknown> {
        return await this.controllerSettingOps.listGlobalGatewayWanStatus(page, pageSize, h);
    }

    public async createWebhook(payload: z.input<typeof webhookCreatePayloadSchema>, h?: CustomHeaders): Promise<unknown> {
        return await this.controllerSettingOps.createWebhook(payload, h);
    }

    public async updateWebhook(webhookId: string, payload: z.input<typeof webhookUpdatePayloadSchema>, h?: CustomHeaders): Promise<unknown> {
        return await this.controllerSettingOps.updateWebhook(webhookId, payload, h);
    }

    public async deleteWebhook(webhookId: string, h?: CustomHeaders): Promise<unknown> {
        return await this.controllerSettingOps.deleteWebhook(webhookId, h);
    }

    public async testWebhook(webhookId: string, payload: z.input<typeof webhookTestPayloadSchema>, h?: CustomHeaders): Promise<unknown> {
        return await this.controllerSettingOps.testWebhook(webhookId, payload, h);
    }

    public async sendTestMail(payload: z.input<typeof schemas.sendMailServerOpenApiVO21Schema>, h?: CustomHeaders): Promise<unknown> {
        return await this.controllerSettingOps.sendTestMail(payload, h);
    }

    public async checkControllerUpdate(payload: z.input<typeof schemas.channelUpgrade21Schema>, h?: CustomHeaders): Promise<unknown> {
        return await this.controllerSettingOps.checkControllerUpdate(payload, h);
    }

    // ---- Hotspot administration (HotspotAdminOperations) ----
    public async getVoucherGroupDetail(groupId: string, query: VoucherGroupQuery, siteId?: string, h?: CustomHeaders): Promise<unknown> {
        return await this.hotspotAdminOps.getVoucherGroupDetail(groupId, query, siteId, h);
    }

    public async getVoucher(voucherId: string, siteId?: string, h?: CustomHeaders): Promise<unknown> {
        return await this.hotspotAdminOps.getVoucher(voucherId, siteId, h);
    }

    public async listVoucherGroupOptions(page: number, pageSize: number, siteId?: string, h?: CustomHeaders): Promise<unknown> {
        return await this.hotspotAdminOps.listVoucherGroupOptions(page, pageSize, siteId, h);
    }

    public async getVoucherGroupConfigLimit(siteId?: string, h?: CustomHeaders): Promise<unknown> {
        return await this.hotspotAdminOps.getVoucherGroupConfigLimit(siteId, h);
    }

    public async listVoucherCurrencies(siteId?: string, h?: CustomHeaders): Promise<unknown> {
        return await this.hotspotAdminOps.listVoucherCurrencies(siteId, h);
    }

    public async getVoucherGroupSummary(groupId: string, siteId?: string, h?: CustomHeaders): Promise<unknown> {
        return await this.hotspotAdminOps.getVoucherGroupSummary(groupId, siteId, h);
    }

    public async listUnusedVoucherCodes(groupId: string, siteId?: string, h?: CustomHeaders): Promise<unknown> {
        return await this.hotspotAdminOps.listUnusedVoucherCodes(groupId, siteId, h);
    }

    public async getPortalCandidates(
        payload: z.input<typeof schemas.portalCandidatesOpenApiVOSchema>,
        siteId?: string,
        h?: CustomHeaders
    ): Promise<unknown> {
        return await this.hotspotAdminOps.getPortalCandidates(payload, siteId, h);
    }

    public async getVoucherHistoryStatistics(
        range: z.input<typeof secondsRangeSchema>,
        groupId?: string,
        siteId?: string,
        h?: CustomHeaders
    ): Promise<unknown> {
        return await this.hotspotAdminOps.getVoucherHistoryStatistics(range, groupId, siteId, h);
    }

    public async getVoucherDurationDistribution(
        range: z.input<typeof secondsRangeSchema>,
        groupId?: string,
        siteId?: string,
        h?: CustomHeaders
    ): Promise<unknown> {
        return await this.hotspotAdminOps.getVoucherDurationDistribution(range, groupId, siteId, h);
    }

    public async getVoucherPriceDistribution(
        range: z.input<typeof secondsRangeSchema>,
        groupId?: string,
        siteId?: string,
        h?: CustomHeaders
    ): Promise<unknown> {
        return await this.hotspotAdminOps.getVoucherPriceDistribution(range, groupId, siteId, h);
    }

    public async deleteVoucher(voucherId: string, siteId?: string, h?: CustomHeaders): Promise<unknown> {
        return await this.hotspotAdminOps.deleteVoucher(voucherId, siteId, h);
    }

    public async deleteVouchers(groupId: string, voucherIds: string[], siteId?: string, h?: CustomHeaders): Promise<unknown> {
        return await this.hotspotAdminOps.deleteVouchers(groupId, voucherIds, siteId, h);
    }

    public async deleteVoucherGroups(groupIds: string[], siteId?: string, h?: CustomHeaders): Promise<unknown> {
        return await this.hotspotAdminOps.deleteVoucherGroups(groupIds, siteId, h);
    }

    public async clearExpiredVouchers(groupId: string, siteId?: string, h?: CustomHeaders): Promise<unknown> {
        return await this.hotspotAdminOps.clearExpiredVouchers(groupId, siteId, h);
    }

    public async clearExpiredVouchersInGroups(groupIds: string[], siteId?: string, h?: CustomHeaders): Promise<unknown> {
        return await this.hotspotAdminOps.clearExpiredVouchersInGroups(groupIds, siteId, h);
    }

    public async setVoucherGroupPattern(
        groupId: string,
        payload: z.input<typeof schemas.editVoucherGroupPatternOpenApiVO06Schema>,
        siteId?: string,
        h?: CustomHeaders
    ): Promise<unknown> {
        return await this.hotspotAdminOps.setVoucherGroupPattern(groupId, payload, siteId, h);
    }

    public async setVoucherCurrency(currency: string, siteId?: string, h?: CustomHeaders): Promise<unknown> {
        return await this.hotspotAdminOps.setVoucherCurrency(currency, siteId, h);
    }

    public async listAuthSurveys(siteId?: string, h?: CustomHeaders): Promise<unknown> {
        return await this.hotspotAdminOps.listAuthSurveys(siteId, h);
    }

    public async getAuthSurvey(surveyId: string, siteId?: string, h?: CustomHeaders): Promise<unknown> {
        return await this.hotspotAdminOps.getAuthSurvey(surveyId, siteId, h);
    }

    public async createAuthSurvey(payload: z.input<typeof authSurveyPayloadSchema>, siteId?: string, h?: CustomHeaders): Promise<unknown> {
        return await this.hotspotAdminOps.createAuthSurvey(payload, siteId, h);
    }

    public async updateAuthSurvey(
        surveyId: string,
        payload: z.input<typeof authSurveyPayloadSchema>,
        siteId?: string,
        h?: CustomHeaders
    ): Promise<unknown> {
        return await this.hotspotAdminOps.updateAuthSurvey(surveyId, payload, siteId, h);
    }

    public async deleteAuthSurvey(surveyId: string, siteId?: string, h?: CustomHeaders): Promise<unknown> {
        return await this.hotspotAdminOps.deleteAuthSurvey(surveyId, siteId, h);
    }

    public async listSurveyResults(surveyId: string, page: number, pageSize: number, siteId?: string, h?: CustomHeaders): Promise<unknown> {
        return await this.hotspotAdminOps.listSurveyResults(surveyId, page, pageSize, siteId, h);
    }

    public async getSurveyResult(resultId: string, siteId?: string, h?: CustomHeaders): Promise<unknown> {
        return await this.hotspotAdminOps.getSurveyResult(resultId, siteId, h);
    }

    public async deleteSurveyResults(surveyId: string, resultIds: string[], siteId?: string, h?: CustomHeaders): Promise<unknown> {
        return await this.hotspotAdminOps.deleteSurveyResults(surveyId, resultIds, siteId, h);
    }

    public async deleteAuthedRecord(recordId: string, siteId?: string, h?: CustomHeaders): Promise<unknown> {
        return await this.hotspotAdminOps.deleteAuthedRecord(recordId, siteId, h);
    }

    public async deleteExpiredAuthedRecords(
        payload: z.input<typeof schemas.deleteFilterInfo06Schema>,
        siteId?: string,
        h?: CustomHeaders
    ): Promise<unknown> {
        return await this.hotspotAdminOps.deleteExpiredAuthedRecords(payload, siteId, h);
    }

    public async extendAuthedRecord(recordId: string, periodMs: number, siteId?: string, h?: CustomHeaders): Promise<unknown> {
        return await this.hotspotAdminOps.extendAuthedRecord(recordId, periodMs, siteId, h);
    }

    public async getHotspotLocalUser(userId: string, siteId?: string, h?: CustomHeaders): Promise<unknown> {
        return await this.hotspotAdminOps.getHotspotLocalUser(userId, siteId, h);
    }

    public async deleteHotspotLocalUsers(userIds: string[], siteId?: string, h?: CustomHeaders): Promise<unknown> {
        return await this.hotspotAdminOps.deleteHotspotLocalUsers(userIds, siteId, h);
    }

    public async clearLocalUserDynamicMac(userId: string, siteId?: string, h?: CustomHeaders): Promise<unknown> {
        return await this.hotspotAdminOps.clearLocalUserDynamicMac(userId, siteId, h);
    }

    public async getHotspotOperator(operatorId: string, siteId?: string, h?: CustomHeaders): Promise<unknown> {
        return await this.hotspotAdminOps.getHotspotOperator(operatorId, siteId, h);
    }

    public async listHotspotRateLimitProfiles(siteId?: string, h?: CustomHeaders): Promise<unknown> {
        return await this.hotspotAdminOps.listHotspotRateLimitProfiles(siteId, h);
    }

    // ---- Dashboard (DashboardOperations) ----
    public async getTopAps(range: z.input<typeof dashboardRangeSchema>, siteId?: string, h?: CustomHeaders): Promise<unknown> {
        return await this.dashboardOps.getTopAps(range, siteId, h);
    }

    public async getMostActiveApps(range: z.input<typeof dashboardRangeSchema>, siteId?: string, h?: CustomHeaders): Promise<unknown> {
        return await this.dashboardOps.getMostActiveApps(range, siteId, h);
    }

    public async getAllNetworkActivity(range: z.input<typeof dashboardRangeSchema>, siteId?: string, h?: CustomHeaders): Promise<unknown> {
        return await this.dashboardOps.getAllNetworkActivity(range, siteId, h);
    }

    public async getClientAssociationActivities(range: z.input<typeof dashboardRangeSchema>, siteId?: string, h?: CustomHeaders): Promise<unknown> {
        return await this.dashboardOps.getClientAssociationActivities(range, siteId, h);
    }

    public async getClientAssociationTimeDistribution(
        range: z.input<typeof dashboardRangeSchema>,
        siteId?: string,
        h?: CustomHeaders
    ): Promise<unknown> {
        return await this.dashboardOps.getClientAssociationTimeDistribution(range, siteId, h);
    }

    public async getClientAppTraffic(
        clientMac: string,
        range: z.input<typeof dashboardRangeSchema>,
        siteId?: string,
        h?: CustomHeaders
    ): Promise<unknown> {
        return await this.dashboardOps.getClientAppTraffic(clientMac, range, siteId, h);
    }

    public async getAppClientTraffic(
        applicationId: string,
        range: z.input<typeof dashboardRangeSchema>,
        siteId?: string,
        h?: CustomHeaders
    ): Promise<unknown> {
        return await this.dashboardOps.getAppClientTraffic(applicationId, range, siteId, h);
    }

    public async getCategoryClientTraffic(
        familyId: string,
        range: z.input<typeof dashboardRangeSchema>,
        siteId?: string,
        h?: CustomHeaders
    ): Promise<unknown> {
        return await this.dashboardOps.getCategoryClientTraffic(familyId, range, siteId, h);
    }

    public async getCategoryAppTraffic(
        familyId: string,
        range: z.input<typeof dashboardRangeSchema>,
        siteId?: string,
        h?: CustomHeaders
    ): Promise<unknown> {
        return await this.dashboardOps.getCategoryAppTraffic(familyId, range, siteId, h);
    }

    public async listClientTraffic(
        range: z.input<typeof dashboardRangeSchema>,
        page: number,
        pageSize: number,
        siteId?: string,
        h?: CustomHeaders
    ): Promise<unknown> {
        return await this.dashboardOps.listClientTraffic(range, page, pageSize, siteId, h);
    }

    public async listAppCategories(
        range: z.input<typeof dashboardRangeSchema>,
        page: number,
        pageSize: number,
        siteId?: string,
        h?: CustomHeaders
    ): Promise<unknown> {
        return await this.dashboardOps.listAppCategories(range, page, pageSize, siteId, h);
    }

    public async listBlockedApps(
        range: z.input<typeof dashboardRangeSchema>,
        page: number,
        pageSize: number,
        siteId?: string,
        h?: CustomHeaders
    ): Promise<unknown> {
        return await this.dashboardOps.listBlockedApps(range, page, pageSize, siteId, h);
    }

    public async listAllowedApps(
        range: z.input<typeof dashboardRangeSchema>,
        page: number,
        pageSize: number,
        siteId?: string,
        h?: CustomHeaders
    ): Promise<unknown> {
        return await this.dashboardOps.listAllowedApps(range, page, pageSize, siteId, h);
    }

    public async getLongestClientUptime(siteId?: string, h?: CustomHeaders): Promise<unknown> {
        return await this.dashboardOps.getLongestClientUptime(siteId, h);
    }

    public async getCurrentClientCount(siteId?: string, h?: CustomHeaders): Promise<unknown> {
        return await this.dashboardOps.getCurrentClientCount(siteId, h);
    }

    public async getClientsBubble(siteId?: string, h?: CustomHeaders): Promise<unknown> {
        return await this.dashboardOps.getClientsBubble(siteId, h);
    }

    public async getClientSsidDistribution(siteId?: string, h?: CustomHeaders): Promise<unknown> {
        return await this.dashboardOps.getClientSsidDistribution(siteId, h);
    }

    public async getClientSignalDistribution(siteId?: string, h?: CustomHeaders): Promise<unknown> {
        return await this.dashboardOps.getClientSignalDistribution(siteId, h);
    }

    public async getClientRssiDistribution(siteId?: string, h?: CustomHeaders): Promise<unknown> {
        return await this.dashboardOps.getClientRssiDistribution(siteId, h);
    }

    public async getClientFrequencyDistribution(siteId?: string, h?: CustomHeaders): Promise<unknown> {
        return await this.dashboardOps.getClientFrequencyDistribution(siteId, h);
    }

    public async getApDensity(siteId?: string, h?: CustomHeaders): Promise<unknown> {
        return await this.dashboardOps.getApDensity(siteId, h);
    }

    public async getGatewayIspLoad(siteId?: string, h?: CustomHeaders): Promise<unknown> {
        return await this.dashboardOps.getGatewayIspLoad(siteId, h);
    }

    public async getNetworkOverviewCard(siteId?: string, h?: CustomHeaders): Promise<unknown> {
        return await this.dashboardOps.getNetworkOverviewCard(siteId, h);
    }

    public async listDashboardTabs(siteId?: string, h?: CustomHeaders): Promise<unknown> {
        return await this.dashboardOps.listDashboardTabs(siteId, h);
    }

    public async listDashboardTabsWithoutOverall(siteId?: string, h?: CustomHeaders): Promise<unknown> {
        return await this.dashboardOps.listDashboardTabsWithoutOverall(siteId, h);
    }

    public async listMostActiveEapsByTraffic(
        deviceNum: number,
        range: z.input<typeof dashboardRangeSchema>,
        siteId?: string,
        h?: CustomHeaders
    ): Promise<unknown> {
        return await this.dashboardOps.listMostActiveEapsByTraffic(deviceNum, range, siteId, h);
    }

    public async searchClientTraffic(
        payload: z.input<typeof schemas.clientTrafficOpenApiQueryDataVOSchema>,
        siteId?: string,
        h?: CustomHeaders
    ): Promise<unknown> {
        return await this.dashboardOps.searchClientTraffic(payload, siteId, h);
    }

    public async createDashboardTab(name: string, siteId?: string, h?: CustomHeaders): Promise<unknown> {
        return await this.dashboardOps.createDashboardTab(name, siteId, h);
    }

    public async updateDashboardTab(
        tabId: string,
        payload: z.input<typeof schemas.updateTabOpenApiVOSchema>,
        siteId?: string,
        h?: CustomHeaders
    ): Promise<unknown> {
        return await this.dashboardOps.updateDashboardTab(tabId, payload, siteId, h);
    }

    public async deleteDashboardTab(tabId: string, siteId?: string, h?: CustomHeaders): Promise<unknown> {
        return await this.dashboardOps.deleteDashboardTab(tabId, siteId, h);
    }

    public async setDashboardTabs(payload: z.input<typeof schemas.batchEditTabsSchema>, siteId?: string, h?: CustomHeaders): Promise<unknown> {
        return await this.dashboardOps.setDashboardTabs(payload, siteId, h);
    }

    // ---- Log administration (LogAdminOperations) ----
    public async listApSsidOverrideAuditLogs(apMac: string, page: number, pageSize: number, siteId?: string, h?: CustomHeaders): Promise<unknown> {
        return await this.logAdminOps.listApSsidOverrideAuditLogs(apMac, page, pageSize, siteId, h);
    }

    public async listFailedUpgradeDevices(upgradeLogId: string, page: number, pageSize: number, h?: CustomHeaders): Promise<unknown> {
        return await this.logAdminOps.listFailedUpgradeDevices(upgradeLogId, page, pageSize, h);
    }

    public async getFailedUpgradeFirmware(upgradeLogId: string, h?: CustomHeaders): Promise<unknown> {
        return await this.logAdminOps.getFailedUpgradeFirmware(upgradeLogId, h);
    }

    public async setGlobalLogNotifications(body: z.input<typeof logNotificationBodySchema>, h?: CustomHeaders): Promise<unknown> {
        return await this.logAdminOps.setGlobalLogNotifications(body, h);
    }

    public async setSiteLogNotifications(body: z.input<typeof logNotificationBodySchema>, siteId?: string, h?: CustomHeaders): Promise<unknown> {
        return await this.logAdminOps.setSiteLogNotifications(body, siteId, h);
    }

    public async setGlobalAuditNotifications(
        payload: z.input<typeof schemas.auditLogNotificationSettingEditOpenApiVOSchema>,
        h?: CustomHeaders
    ): Promise<unknown> {
        return await this.logAdminOps.setGlobalAuditNotifications(payload, h);
    }

    public async setSiteAuditNotifications(
        payload: z.input<typeof schemas.auditLogNotificationSettingEditOpenApiVOSchema>,
        siteId?: string,
        h?: CustomHeaders
    ): Promise<unknown> {
        return await this.logAdminOps.setSiteAuditNotifications(payload, siteId, h);
    }

    public async resetGlobalLogNotifications(h?: CustomHeaders): Promise<unknown> {
        return await this.logAdminOps.resetGlobalLogNotifications(h);
    }

    public async resetSiteLogNotifications(siteId?: string, h?: CustomHeaders): Promise<unknown> {
        return await this.logAdminOps.resetSiteLogNotifications(siteId, h);
    }

    public async resolveSiteAlerts(selection: z.input<typeof logSelectionSchema>, siteId?: string, h?: CustomHeaders): Promise<unknown> {
        return await this.logAdminOps.resolveSiteAlerts(selection, siteId, h);
    }

    public async deleteSiteEventLogs(selection: z.input<typeof logSelectionSchema>, siteId?: string, h?: CustomHeaders): Promise<unknown> {
        return await this.logAdminOps.deleteSiteEventLogs(selection, siteId, h);
    }

    public async deleteSiteAlertLogs(selection: z.input<typeof logSelectionSchema>, siteId?: string, h?: CustomHeaders): Promise<unknown> {
        return await this.logAdminOps.deleteSiteAlertLogs(selection, siteId, h);
    }

    public async deleteGlobalEventLogs(selection: z.input<typeof logSelectionSchema>, h?: CustomHeaders): Promise<unknown> {
        return await this.logAdminOps.deleteGlobalEventLogs(selection, h);
    }

    public async deleteGlobalAlertLogs(selection: z.input<typeof logSelectionSchema>, h?: CustomHeaders): Promise<unknown> {
        return await this.logAdminOps.deleteGlobalAlertLogs(selection, h);
    }

    // ---- Incidents, health and reports (MonitoringOperations) ----
    public async listAnomalyIncidents(
        range: z.input<typeof monitoringRangeSchema>,
        page: number,
        pageSize: number,
        filters: IncidentFilters = {},
        siteId?: string,
        h?: CustomHeaders
    ): Promise<unknown> {
        return await this.monitoringOps.listAnomalyIncidents(range, page, pageSize, filters, siteId, h);
    }

    public async getAnomalyIncident(incidentId: string, siteId?: string, h?: CustomHeaders): Promise<unknown> {
        return await this.monitoringOps.getAnomalyIncident(incidentId, siteId, h);
    }

    public async getUnresolvedIncidentCount(siteId?: string, h?: CustomHeaders): Promise<unknown> {
        return await this.monitoringOps.getUnresolvedIncidentCount(siteId, h);
    }

    public async getAnomalyStatistics(range: z.input<typeof monitoringRangeSchema>, siteId?: string, h?: CustomHeaders): Promise<unknown> {
        return await this.monitoringOps.getAnomalyStatistics(range, siteId, h);
    }

    public async getAnomalyIncidentDistribution(range: z.input<typeof monitoringRangeSchema>, siteId?: string, h?: CustomHeaders): Promise<unknown> {
        return await this.monitoringOps.getAnomalyIncidentDistribution(range, siteId, h);
    }

    public async getAnomalyCategoryIncidents(
        range: z.input<typeof monitoringRangeSchema>,
        category: number,
        siteId?: string,
        h?: CustomHeaders
    ): Promise<unknown> {
        return await this.monitoringOps.getAnomalyCategoryIncidents(range, category, siteId, h);
    }

    public async listInfluencingDevices(
        deviceMac: string,
        anomalyCode: string,
        page: number,
        pageSize: number,
        siteId?: string,
        h?: CustomHeaders
    ): Promise<unknown> {
        return await this.monitoringOps.listInfluencingDevices(deviceMac, anomalyCode, page, pageSize, siteId, h);
    }

    public async listInfluencingClients(
        deviceMac: string,
        anomalyCode: string,
        page: number,
        pageSize: number,
        siteId?: string,
        h?: CustomHeaders
    ): Promise<unknown> {
        return await this.monitoringOps.listInfluencingClients(deviceMac, anomalyCode, page, pageSize, siteId, h);
    }

    public async listDeviceIncidents(
        deviceMac: string,
        range: z.input<typeof monitoringRangeSchema>,
        page: number,
        pageSize: number,
        siteId?: string,
        h?: CustomHeaders
    ): Promise<unknown> {
        return await this.monitoringOps.listDeviceIncidents(deviceMac, range, page, pageSize, siteId, h);
    }

    public async listStackIncidents(
        stackId: string,
        range: z.input<typeof monitoringRangeSchema>,
        page: number,
        pageSize: number,
        siteId?: string,
        h?: CustomHeaders
    ): Promise<unknown> {
        return await this.monitoringOps.listStackIncidents(stackId, range, page, pageSize, siteId, h);
    }

    public async getIncidentRanking(
        query: z.input<typeof schemas.incidentRankingQueryVOSchema>,
        siteId?: string,
        h?: CustomHeaders
    ): Promise<unknown> {
        return await this.monitoringOps.getIncidentRanking(query, siteId, h);
    }

    public async getIncidentObjectRanking(
        query: z.input<typeof schemas.incidentRankingQueryVOSchema>,
        siteId?: string,
        h?: CustomHeaders
    ): Promise<unknown> {
        return await this.monitoringOps.getIncidentObjectRanking(query, siteId, h);
    }

    public async setIncidentStatus(incidentIds: string[], targetStatus: number, siteId?: string, h?: CustomHeaders): Promise<unknown> {
        return await this.monitoringOps.setIncidentStatus(incidentIds, targetStatus, siteId, h);
    }

    public async deleteIncidents(incidentIds: string[], siteId?: string, h?: CustomHeaders): Promise<unknown> {
        return await this.monitoringOps.deleteIncidents(incidentIds, siteId, h);
    }

    public async listAnomalySettings(page: number, pageSize: number, siteId?: string, h?: CustomHeaders): Promise<unknown> {
        return await this.monitoringOps.listAnomalySettings(page, pageSize, siteId, h);
    }

    public async setAnomalyEventSetting(
        payload: z.input<typeof schemas.anomalyEventSettingEditOpenApiVOSchema>,
        siteId?: string,
        h?: CustomHeaders
    ): Promise<unknown> {
        return await this.monitoringOps.setAnomalyEventSetting(payload, siteId, h);
    }

    public async getAnomalyNotificationSetting(siteId?: string, h?: CustomHeaders): Promise<unknown> {
        return await this.monitoringOps.getAnomalyNotificationSetting(siteId, h);
    }

    public async setAnomalyNotification(
        payload: z.input<typeof schemas.setNotificationOpenApiVOSchema>,
        siteId?: string,
        h?: CustomHeaders
    ): Promise<unknown> {
        return await this.monitoringOps.setAnomalyNotification(payload, siteId, h);
    }

    public async getWifiHealthTimeline(range: z.input<typeof monitoringRangeSchema>, siteId?: string, h?: CustomHeaders): Promise<unknown> {
        return await this.monitoringOps.getWifiHealthTimeline(range, siteId, h);
    }

    public async getWifiSubHealthTimeline(range: z.input<typeof monitoringRangeSchema>, siteId?: string, h?: CustomHeaders): Promise<unknown> {
        return await this.monitoringOps.getWifiSubHealthTimeline(range, siteId, h);
    }

    public async getApHealthDetail(
        apMac: string,
        range: z.input<typeof monitoringRangeSchema>,
        siteId?: string,
        h?: CustomHeaders
    ): Promise<unknown> {
        return await this.monitoringOps.getApHealthDetail(apMac, range, siteId, h);
    }

    public async getApHealthTimeline(
        apMac: string,
        range: z.input<typeof monitoringRangeSchema>,
        siteId?: string,
        h?: CustomHeaders
    ): Promise<unknown> {
        return await this.monitoringOps.getApHealthTimeline(apMac, range, siteId, h);
    }

    public async listWifiHealthTopClients(time: number, topK: number, searchKey?: string, siteId?: string, h?: CustomHeaders): Promise<unknown> {
        return await this.monitoringOps.listWifiHealthTopClients(time, topK, searchKey, siteId, h);
    }

    public async listReportTabs(siteId?: string, h?: CustomHeaders): Promise<unknown> {
        return await this.monitoringOps.listReportTabs(siteId, h);
    }

    public async getReportTab(tabId: string, siteId?: string, h?: CustomHeaders): Promise<unknown> {
        return await this.monitoringOps.getReportTab(tabId, siteId, h);
    }

    public async createReportTab(payload: z.input<typeof reportTabPayloadSchema>, siteId?: string, h?: CustomHeaders): Promise<unknown> {
        return await this.monitoringOps.createReportTab(payload, siteId, h);
    }

    public async updateReportTab(
        tabId: string,
        payload: z.input<typeof reportTabPayloadSchema>,
        siteId?: string,
        h?: CustomHeaders
    ): Promise<unknown> {
        return await this.monitoringOps.updateReportTab(tabId, payload, siteId, h);
    }

    public async deleteReportTabs(tabIds: string[], siteId?: string, h?: CustomHeaders): Promise<unknown> {
        return await this.monitoringOps.deleteReportTabs(tabIds, siteId, h);
    }

    // ---- Site templates (SiteTemplateOperations) ----
    public async listSiteTemplateModules(h?: CustomHeaders): Promise<unknown> {
        return await this.siteTemplateOps.listSiteTemplateModules(h);
    }

    public async listSiteTemplateAllModules(h?: CustomHeaders): Promise<unknown> {
        return await this.siteTemplateOps.listSiteTemplateAllModules(h);
    }

    public async getSiteTemplateSpecification(siteTemplateId: string, h?: CustomHeaders): Promise<unknown> {
        return await this.siteTemplateOps.getSiteTemplateSpecification(siteTemplateId, h);
    }

    public async getSiteTemplateCapacity(siteTemplateId: string, h?: CustomHeaders): Promise<unknown> {
        return await this.siteTemplateOps.getSiteTemplateCapacity(siteTemplateId, h);
    }

    public async listSiteTemplateBoundSites(siteTemplateId: string, page: number, pageSize: number, h?: CustomHeaders): Promise<unknown> {
        return await this.siteTemplateOps.listSiteTemplateBoundSites(siteTemplateId, page, pageSize, h);
    }

    public async listSitesAvailableForTemplate(
        siteTemplateId: string,
        page: number,
        pageSize: number,
        searchKey?: string,
        h?: CustomHeaders
    ): Promise<unknown> {
        return await this.siteTemplateOps.listSitesAvailableForTemplate(siteTemplateId, page, pageSize, searchKey, h);
    }

    public async createSiteTemplate(payload: z.input<typeof siteTemplateCreateSchema>, h?: CustomHeaders): Promise<unknown> {
        return await this.siteTemplateOps.createSiteTemplate(payload, h);
    }

    public async renameSiteTemplate(siteTemplateId: string, name: string, h?: CustomHeaders): Promise<unknown> {
        return await this.siteTemplateOps.renameSiteTemplate(siteTemplateId, name, h);
    }

    public async deleteSiteTemplate(siteTemplateId: string, h?: CustomHeaders): Promise<unknown> {
        return await this.siteTemplateOps.deleteSiteTemplate(siteTemplateId, h);
    }

    public async copySiteTemplate(siteTemplateId: string, name: string, h?: CustomHeaders): Promise<unknown> {
        return await this.siteTemplateOps.copySiteTemplate(siteTemplateId, name, h);
    }

    public async createSiteFromTemplate(payload: z.input<typeof schemas.createSiteByTemplate02Schema>, h?: CustomHeaders): Promise<unknown> {
        return await this.siteTemplateOps.createSiteFromTemplate(payload, h);
    }

    public async bindSiteToTemplate(
        siteTemplateId: string,
        payload: z.input<typeof schemas.bindSiteOpenApiVO02Schema>,
        h?: CustomHeaders
    ): Promise<unknown> {
        return await this.siteTemplateOps.bindSiteToTemplate(siteTemplateId, payload, h);
    }

    public async unbindSitesFromTemplate(siteTemplateId: string, siteIds: string[], h?: CustomHeaders): Promise<unknown> {
        return await this.siteTemplateOps.unbindSitesFromTemplate(siteTemplateId, siteIds, h);
    }

    public async syncSitesWithTemplate(siteTemplateId: string, siteIds: string[], h?: CustomHeaders): Promise<unknown> {
        return await this.siteTemplateOps.syncSitesWithTemplate(siteTemplateId, siteIds, h);
    }
}
