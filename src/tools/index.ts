import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { ToolCategory, ToolPermission } from '../config.js';
import type { OmadaClient } from '../omadaClient/index.js';
import { type CatalogOptions, type CatalogTool, registerCatalog } from '../server/catalog.js';
import { logger } from '../utils/logger.js';
import { registerAdoptDeviceTool } from './adoptDevice.js';
import { registerAuthorizeHotspotClientTool } from './authorizeHotspotClient.js';
import { registerBackupControllerTool } from './backupController.js';
import { registerBackupControllerToFileServerTool } from './backupControllerToFileServer.js';
import { registerBackupSitesTool } from './backupSites.js';
import { registerBackupSitesToFileServerTool } from './backupSitesToFileServer.js';
import { registerBindSiteToTemplateTool } from './bindSiteToTemplate.js';
import { registerBlockClientTool } from './blockClient.js';
import { registerBlockCountryTool } from './blockCountry.js';
import { registerCancelSwitchCableTestTool } from './cancelSwitchCableTest.js';
import { registerCheckControllerUpdateTool } from './checkControllerUpdate.js';
import { registerClearExpiredVouchersTool } from './clearExpiredVouchers.js';
import { registerClearLocalUserDynamicMacTool } from './clearLocalUserDynamicMac.js';
import { registerClearSwitchPortCountersTool } from './clearSwitchPortCounters.js';
import { registerCopySiteTemplateTool } from './copySiteTemplate.js';
import { registerCopyWifiCallingProfileTool } from './copyWifiCallingProfile.js';
import { registerCreateApGroupTool } from './createApGroup.js';
import { registerCreateApnProfileTool } from './createApnProfile.js';
import { registerCreateAuthSurveyTool } from './createAuthSurvey.js';
import { registerCreateDashboardTabTool } from './createDashboardTab.js';
import { registerCreateDdnsEntryTool } from './createDdnsEntry.js';
import { registerCreateDhcpReservationTool } from './createDhcpReservation.js';
import { registerCreateEapAclTool } from './createEapAcl.js';
import { registerCreateExternalUserGroupTool } from './createExternalUserGroup.js';
import { registerCreateGatewayAclTool } from './createGatewayAcl.js';
import { registerCreateGroupProfileTool } from './createGroupProfile.js';
import { registerCreateHotspotLocalUserTool } from './createHotspotLocalUser.js';
import { registerCreateHotspotOperatorTool } from './createHotspotOperator.js';
import { registerCreateIotServerTool } from './createIotServer.js';
import { registerCreateIpMacBindingTool } from './createIpMacBinding.js';
import { registerCreateIpsAllowEntryTool } from './createIpsAllowEntry.js';
import { registerCreateLanDnsRuleTool } from './createLanDnsRule.js';
import { registerCreateLanNetworkTool } from './createLanNetwork.js';
import { registerCreateLanProfileTool } from './createLanProfile.js';
import { registerCreateLdapProfileTool } from './createLdapProfile.js';
import { registerCreateMacFilterTool } from './createMacFilter.js';
import { registerCreateMdnsProfileTool } from './createMdnsProfile.js';
import { registerCreateMdnsRuleTool } from './createMdnsRule.js';
import { registerCreateOneToOneNatTool } from './createOneToOneNat.js';
import { registerCreateOuiProfileTool } from './createOuiProfile.js';
import { registerCreatePoeScheduleTool } from './createPoeSchedule.js';
import { registerCreatePolicyRouteTool } from './createPolicyRoute.js';
import { registerCreatePortForwardingRuleTool } from './createPortForwardingRule.js';
import { registerCreatePortScheduleTool } from './createPortSchedule.js';
import { registerCreateRadiusProfileTool } from './createRadiusProfile.js';
import { registerCreateRadiusUserTool } from './createRadiusUser.js';
import { registerCreateRateLimitProfileTool } from './createRateLimitProfile.js';
import { registerCreateReportTabTool } from './createReportTab.js';
import { registerCreateRoleTool } from './createRole.js';
import { registerCreateSamlIdpTool } from './createSamlIdp.js';
import { registerCreateScenarioTool } from './createScenario.js';
import { registerCreateServiceTypeTool } from './createServiceType.js';
import { registerCreateSiteTool } from './createSite.js';
import { registerCreateSiteFromTemplateTool } from './createSiteFromTemplate.js';
import { registerCreateSiteTagTool } from './createSiteTag.js';
import { registerCreateSiteTemplateTool } from './createSiteTemplate.js';
import { registerCreateSsidTool } from './createSsid.js';
import { registerCreateSslVpnLockTool } from './createSslVpnLock.js';
import { registerCreateSslVpnResourceTool } from './createSslVpnResource.js';
import { registerCreateSslVpnResourceGroupTool } from './createSslVpnResourceGroup.js';
import { registerCreateSslVpnUserGroupTool } from './createSslVpnUserGroup.js';
import { registerCreateStaticRouteTool } from './createStaticRoute.js';
import { registerCreateSwitchAclTool } from './createSwitchAcl.js';
import { registerCreateSwitchPortTagTool } from './createSwitchPortTag.js';
import { registerCreateTimeRangeProfileTool } from './createTimeRangeProfile.js';
import { registerCreateUrlFilterRuleTool } from './createUrlFilterRule.js';
import { registerCreateVoucherGroupTool } from './createVoucherGroup.js';
import { registerCreateVpnUserTool } from './createVpnUser.js';
import { registerCreateWebhookTool } from './createWebhook.js';
import { registerCreateWifiCallingProfileTool } from './createWifiCallingProfile.js';
import { registerCreateWlanGroupTool } from './createWlanGroup.js';
import { registerDeleteAclTool } from './deleteAcl.js';
import { registerDeleteApGroupTool } from './deleteApGroup.js';
import { registerDeleteApnProfileTool } from './deleteApnProfile.js';
import { registerDeleteAppControlRuleTool } from './deleteAppControlRule.js';
import { registerDeleteAuthedRecordTool } from './deleteAuthedRecord.js';
import { registerDeleteAuthSurveyTool } from './deleteAuthSurvey.js';
import { registerDeleteBandwidthControlRuleTool } from './deleteBandwidthControlRule.js';
import { registerDeleteClientToSiteVpnClientTool } from './deleteClientToSiteVpnClient.js';
import { registerDeleteClientToSiteVpnServerTool } from './deleteClientToSiteVpnServer.js';
import { registerDeleteDashboardTabTool } from './deleteDashboardTab.js';
import { registerDeleteDdnsEntryTool } from './deleteDdnsEntry.js';
import { registerDeleteDhcpReservationTool } from './deleteDhcpReservation.js';
import { registerDeleteExpiredAuthedRecordsTool } from './deleteExpiredAuthedRecords.js';
import { registerDeleteExternalUserGroupTool } from './deleteExternalUserGroup.js';
import { registerDeleteGlobalAlertLogsTool } from './deleteGlobalAlertLogs.js';
import { registerDeleteGlobalEventLogsTool } from './deleteGlobalEventLogs.js';
import { registerDeleteGroupProfileTool } from './deleteGroupProfile.js';
import { registerDeleteHotspotLocalUserTool } from './deleteHotspotLocalUser.js';
import { registerDeleteHotspotLocalUsersTool } from './deleteHotspotLocalUsers.js';
import { registerDeleteHotspotOperatorTool } from './deleteHotspotOperator.js';
import { registerDeleteIncidentsTool } from './deleteIncidents.js';
import { registerDeleteIotServerTool } from './deleteIotServer.js';
import { registerDeleteIpMacBindingTool } from './deleteIpMacBinding.js';
import { registerDeleteIpsAllowEntryTool } from './deleteIpsAllowEntry.js';
import { registerDeleteIpsBlockEntryTool } from './deleteIpsBlockEntry.js';
import { registerDeleteIpsSignatureTool } from './deleteIpsSignature.js';
import { registerDeleteLanDnsRuleTool } from './deleteLanDnsRule.js';
import { registerDeleteLanNetworkTool } from './deleteLanNetwork.js';
import { registerDeleteLanProfileTool } from './deleteLanProfile.js';
import { registerDeleteLdapProfileTool } from './deleteLdapProfile.js';
import { registerDeleteMacFilterTool } from './deleteMacFilter.js';
import { registerDeleteMdnsProfileTool } from './deleteMdnsProfile.js';
import { registerDeleteMdnsRuleTool } from './deleteMdnsRule.js';
import { registerDeleteOneToOneNatTool } from './deleteOneToOneNat.js';
import { registerDeleteOuiProfileTool } from './deleteOuiProfile.js';
import { registerDeletePoeScheduleTool } from './deletePoeSchedule.js';
import { registerDeletePolicyRouteTool } from './deletePolicyRoute.js';
import { registerDeletePortForwardingRuleTool } from './deletePortForwardingRule.js';
import { registerDeletePortScheduleTool } from './deletePortSchedule.js';
import { registerDeleteRadiusProfileTool } from './deleteRadiusProfile.js';
import { registerDeleteRadiusUserTool } from './deleteRadiusUser.js';
import { registerDeleteRateLimitProfileTool } from './deleteRateLimitProfile.js';
import { registerDeleteReportTabsTool } from './deleteReportTabs.js';
import { registerDeleteRoleTool } from './deleteRole.js';
import { registerDeleteSamlIdpTool } from './deleteSamlIdp.js';
import { registerDeleteScenarioTool } from './deleteScenario.js';
import { registerDeleteServiceTypeTool } from './deleteServiceType.js';
import { registerDeleteSiteTool } from './deleteSite.js';
import { registerDeleteSiteAlertLogsTool } from './deleteSiteAlertLogs.js';
import { registerDeleteSiteEventLogsTool } from './deleteSiteEventLogs.js';
import { registerDeleteSiteTagTool } from './deleteSiteTag.js';
import { registerDeleteSiteTemplateTool } from './deleteSiteTemplate.js';
import { registerDeleteSiteToSiteVpnTool } from './deleteSiteToSiteVpn.js';
import { registerDeleteSsidTool } from './deleteSsid.js';
import { registerDeleteSslVpnLockTool } from './deleteSslVpnLock.js';
import { registerDeleteSslVpnResourceTool } from './deleteSslVpnResource.js';
import { registerDeleteSslVpnResourceGroupTool } from './deleteSslVpnResourceGroup.js';
import { registerDeleteSslVpnUserGroupTool } from './deleteSslVpnUserGroup.js';
import { registerDeleteStaticRouteTool } from './deleteStaticRoute.js';
import { registerDeleteSurveyResultsTool } from './deleteSurveyResults.js';
import { registerDeleteSwitchPortTagTool } from './deleteSwitchPortTag.js';
import { registerDeleteTimeRangeProfileTool } from './deleteTimeRangeProfile.js';
import { registerDeleteUrlFilterRuleTool } from './deleteUrlFilterRule.js';
import { registerDeleteVoucherGroupTool } from './deleteVoucherGroup.js';
import { registerDeleteVoucherGroupsTool } from './deleteVoucherGroups.js';
import { registerDeleteVouchersTool } from './deleteVouchers.js';
import { registerDeleteVpnUserTool } from './deleteVpnUser.js';
import { registerDeleteWebhookTool } from './deleteWebhook.js';
import { registerDeleteWifiCallingProfileTool } from './deleteWifiCallingProfile.js';
import { registerDeleteWireguardTool } from './deleteWireguard.js';
import { registerDeleteWireguardPeerTool } from './deleteWireguardPeer.js';
import { registerDeleteWlanGroupTool } from './deleteWlanGroup.js';
import { registerDiagnoseCameraConnectivityTool } from './diagnoseCameraConnectivity.js';
import { registerDiagnoseClientTool } from './diagnoseClient.js';
import { registerDiagnoseLogsTool } from './diagnoseLogs.js';
import { registerDisableClientRateLimitTool } from './disableClientRateLimit.js';
import { registerDisconnectHotspotAuthRecordTool } from './disconnectHotspotAuthRecord.js';
import { registerExtendAuthedRecordTool } from './extendAuthedRecord.js';
import { registerForceProvisionDeviceTool } from './forceProvisionDevice.js';
import { registerGetAccessControlTool } from './getAccessControl.js';
import { registerGetAclConfigTypeSettingTool } from './getAclConfigTypeSetting.js';
import { registerGetAdvancedVpnSettingTool } from './getAdvancedVpnSetting.js';
import { registerGetAlgTool } from './getAlg.js';
import { registerGetAllCloudUsersTool } from './getAllCloudUsers.js';
import { registerGetAllDeviceBySiteTool } from './getAllDeviceBySite.js';
import { registerGetAllLocalUsersTool } from './getAllLocalUsers.js';
import { registerGetAllNetworkActivityTool } from './getAllNetworkActivity.js';
import { registerGetAllRolesTool } from './getAllRoles.js';
import { registerGetAllUsersAppTool } from './getAllUsersApp.js';
import { registerGetAnomalyCategoryIncidentsTool } from './getAnomalyCategoryIncidents.js';
import { registerGetAnomalyIncidentTool } from './getAnomalyIncident.js';
import { registerGetAnomalyIncidentDistributionTool } from './getAnomalyIncidentDistribution.js';
import { registerGetAnomalyNotificationSettingTool } from './getAnomalyNotificationSetting.js';
import { registerGetAnomalyStatisticsTool } from './getAnomalyStatistics.js';
import { registerGetApAfcStatusTool } from './getApAfcStatus.js';
import { registerGetApDensityTool } from './getApDensity.js';
import { registerGetApDetailTool } from './getApDetail.js';
import { registerGetApGeneralConfigTool } from './getApGeneralConfig.js';
import { registerGetApGroupTool } from './getApGroup.js';
import { registerGetApGroupCountTool } from './getApGroupCount.js';
import { registerGetApHealthDetailTool } from './getApHealthDetail.js';
import { registerGetApHealthTimelineTool } from './getApHealthTimeline.js';
import { registerGetApInterferenceDetectionStatusTool } from './getApInterferenceDetectionStatus.js';
import { registerGetApIpv6ConfigTool } from './getApIpv6Config.js';
import { registerGetApL3AccessTool } from './getApL3Access.js';
import { registerGetApLagConfigTool } from './getApLagConfig.js';
import { registerGetApLanTrafficTool } from './getApLanTraffic.js';
import { registerGetApLldpConfigTool } from './getApLldpConfig.js';
import { registerGetApLoadBalanceTool } from './getApLoadBalance.js';
import { registerGetApManagementWlanTool } from './getApManagementWlan.js';
import { registerGetApOfdmaConfigTool } from './getApOfdmaConfig.js';
import { registerGetAppClientTrafficTool } from './getAppClientTraffic.js';
import { registerGetAppControlCategoriesTool } from './getAppControlCategories.js';
import { registerGetAppControlRulesTool } from './getAppControlRules.js';
import { registerGetAppGroupProfileTool } from './getAppGroupProfile.js';
import { registerGetApplicationAclTool } from './getApplicationAcl.js';
import { registerGetApplicationControlStatusTool } from './getApplicationControlStatus.js';
import { registerGetApQosConfigTool } from './getApQosConfig.js';
import { registerGetApRadiosTool } from './getApRadios.js';
import { registerGetApRfScanResultTool } from './getApRfScanResult.js';
import { registerGetApSnmpConfigTool } from './getApSnmpConfig.js';
import { registerGetApSsidOverridesTool } from './getApSsidOverrides.js';
import { registerGetApUplinkConfigTool } from './getApUplinkConfig.js';
import { registerGetApVlanConfigTool } from './getApVlanConfig.js';
import { registerGetAttackDefenseSettingTool } from './getAttackDefenseSetting.js';
import { registerGetAuditLogSettingForGlobalTool } from './getAuditLogSettingForGlobal.js';
import { registerGetAuditLogSettingForSiteTool } from './getAuditLogSettingForSite.js';
import { registerGetAuditLogsForGlobalTool } from './getAuditLogsForGlobal.js';
import { registerGetAuthSurveyTool } from './getAuthSurvey.js';
import { registerGetAvailableRolesTool } from './getAvailableRoles.js';
import { registerGetBackupFileListTool } from './getBackupFileList.js';
import { registerGetBackupResultTool } from './getBackupResult.js';
import { registerGetBackupScheduleTool } from './getBackupSchedule.js';
import { registerGetBandSteeringSettingTool } from './getBandSteeringSetting.js';
import { registerGetBandwidthControlTool } from './getBandwidthControl.js';
import { registerGetBandwidthCtrlTool } from './getBandwidthCtrl.js';
import { registerGetBandwidthCtrlDetailTool } from './getBandwidthCtrlDetail.js';
import { registerGetBeaconControlSettingTool } from './getBeaconControlSetting.js';
import { registerGetBuiltinRadiusUsersTool } from './getBuiltinRadiusUsers.js';
import { registerGetCableTestFullResultsTool } from './getCableTestFullResults.js';
import { registerGetCableTestLogsTool } from './getCableTestLogs.js';
import { registerGetCategoryAppTrafficTool } from './getCategoryAppTraffic.js';
import { registerGetCategoryClientTrafficTool } from './getCategoryClientTraffic.js';
import { registerGetCertificateTool } from './getCertificate.js';
import { registerGetChannelLimitSettingTool } from './getChannelLimitSetting.js';
import { registerGetChannelsTool } from './getChannels.js';
import { registerGetClientTool } from './getClient.js';
import { registerGetClientActiveTimeoutTool } from './getClientActiveTimeout.js';
import { registerGetClientAppTrafficTool } from './getClientAppTraffic.js';
import { registerGetClientAssociationActivitiesTool } from './getClientAssociationActivities.js';
import { registerGetClientAssociationTimeDistributionTool } from './getClientAssociationTimeDistribution.js';
import { registerGetClientConnectionHistoryTool } from './getClientConnectionHistory.js';
import { registerGetClientCorrectionOptionsTool } from './getClientCorrectionOptions.js';
import { registerGetClientDetailTool } from './getClientDetail.js';
import { registerGetClientDetailInformationTool } from './getClientDetailInformation.js';
import { registerGetClientFrequencyDistributionTool } from './getClientFrequencyDistribution.js';
import { registerGetClientHealthDetailTool } from './getClientHealthDetail.js';
import { registerGetClientHealthTimelineTool } from './getClientHealthTimeline.js';
import { registerGetClientHistoryDataEnableTool } from './getClientHistoryDataEnable.js';
import { registerGetClientIncidentCountsTool } from './getClientIncidentCounts.js';
import { registerGetClientLinkTopologyTool } from './getClientLinkTopology.js';
import { registerGetClientRecognitionTool } from './getClientRecognition.js';
import { registerGetClientRssiDistributionTool } from './getClientRssiDistribution.js';
import { registerGetClientSearchFieldOptionsTool } from './getClientSearchFieldOptions.js';
import { registerGetClientSignalDistributionTool } from './getClientSignalDistribution.js';
import { registerGetClientSsidDistributionTool } from './getClientSsidDistribution.js';
import { registerGetClientStatsTool } from './getClientStats.js';
import { registerGetClientsBubbleTool } from './getClientsBubble.js';
import { registerGetClientsDistributionTool } from './getClientsDistribution.js';
import { registerGetClientTimelineTool } from './getClientTimeline.js';
import { registerGetClientToSiteVpnServerInfoTool } from './getClientToSiteVpnServerInfo.js';
import { registerGetCloudAccessStatusTool } from './getCloudAccessStatus.js';
import { registerGetCloudUserInfoTool } from './getCloudUserInfo.js';
import { registerGetControllerDstInfoTool } from './getControllerDstInfo.js';
import { registerGetControllerPortTool } from './getControllerPort.js';
import { registerGetControllerStatusTool } from './getControllerStatus.js';
import { registerGetCurrentClientCountTool } from './getCurrentClientCount.js';
import { registerGetDashboardMostActiveEapsTool } from './getDashboardMostActiveEaps.js';
import { registerGetDashboardMostActiveSwitchesTool } from './getDashboardMostActiveSwitches.js';
import { registerGetDashboardOverviewTool } from './getDashboardOverview.js';
import { registerGetDashboardPoEUsageTool } from './getDashboardPoEUsage.js';
import { registerGetDashboardSwitchSummaryTool } from './getDashboardSwitchSummary.js';
import { registerGetDashboardTopCpuUsageTool } from './getDashboardTopCpuUsage.js';
import { registerGetDashboardTopMemoryUsageTool } from './getDashboardTopMemoryUsage.js';
import { registerGetDashboardTrafficActivitiesTool } from './getDashboardTrafficActivities.js';
import { registerGetDashboardWifiSummaryTool } from './getDashboardWifiSummary.js';
import { registerGetDataRetentionTool } from './getDataRetention.js';
import { registerGetDdnsGridTool } from './getDdnsGrid.js';
import { registerGetDeviceTool } from './getDevice.js';
import { registerGetDeviceAccessManagementTool } from './getDeviceAccessManagement.js';
import { registerGetDeviceTagListTool } from './getDeviceTagList.js';
import { registerGetDhcpReservationGridTool } from './getDhcpReservationGrid.js';
import { registerGetDisableNatListTool } from './getDisableNatList.js';
import { registerGetDnsCacheDataListTool } from './getDnsCacheDataList.js';
import { registerGetDnsCacheSettingTool } from './getDnsCacheSetting.js';
import { registerGetDnsProxyTool } from './getDnsProxy.js';
import { registerGetDot1xConfigTool } from './getDot1xConfig.js';
import { registerGetDownlinkWiredDevicesTool } from './getDownlinkWiredDevices.js';
import { registerGetDscpConfigTool } from './getDscpConfig.js';
import { registerGetEapDot1xSettingTool } from './getEapDot1xSetting.js';
import { registerGetEoGreTunnelConfigTool } from './getEoGreTunnelConfig.js';
import { registerGetExperienceImprovementTool } from './getExperienceImprovement.js';
import { registerGetFailedUpgradeFirmwareTool } from './getFailedUpgradeFirmware.js';
import { registerGetFirewallSettingTool } from './getFirewallSetting.js';
import { registerGetFirmwareInfoTool } from './getFirmwareInfo.js';
import { registerGetFirmwareUpgradePlanTool } from './getFirmwareUpgradePlan.js';
import { registerGetGatewayDetailTool } from './getGatewayDetail.js';
import { registerGetGatewayHealthTool } from './getGatewayHealth.js';
import { registerGetGatewayIspLoadTool } from './getGatewayIspLoad.js';
import { registerGetGatewayLanStatusTool } from './getGatewayLanStatus.js';
import { registerGetGatewayPortsTool } from './getGatewayPorts.js';
import { registerGetGatewayQosClassRulesTool } from './getGatewayQosClassRules.js';
import { registerGetGatewayWanStatusTool } from './getGatewayWanStatus.js';
import { registerGetGeneralSettingsTool } from './getGeneralSettings.js';
import { registerGetGlobalDashboardOverviewTool } from './getGlobalDashboardOverview.js';
import { registerGetGlobalSecuritySettingTool } from './getGlobalSecuritySetting.js';
import { registerGetGoogleLdapProfileTool } from './getGoogleLdapProfile.js';
import { registerGetGridAllowListTool } from './getGridAllowList.js';
import { registerGetGridAllowMacFilteringTool } from './getGridAllowMacFiltering.js';
import { registerGetGridAutoCheckUpgradeTool } from './getGridAutoCheckUpgrade.js';
import { registerGetGridBandwidthCtrlRuleTool } from './getGridBandwidthCtrlRule.js';
import { registerGetGridBlockListTool } from './getGridBlockList.js';
import { registerGetGridClientHistoryTool } from './getGridClientHistory.js';
import { registerGetGridDashboardIpsecTunnelStatsTool } from './getGridDashboardIpsecTunnelStats.js';
import { registerGetGridDashboardOpenVpnTunnelStatsTool } from './getGridDashboardOpenVpnTunnelStats.js';
import { registerGetGridDashboardTunnelStatsTool } from './getGridDashboardTunnelStats.js';
import { registerGetGridDenyMacFilteringTool } from './getGridDenyMacFiltering.js';
import { registerGetGridEapRuleTool } from './getGridEapRule.js';
import { registerGetGridGatewayRuleTool } from './getGridGatewayRule.js';
import { registerGetGridIpMacBindingTool } from './getGridIpMacBinding.js';
import { registerGetGridIpsecFailoverTool } from './getGridIpsecFailover.js';
import { registerGetGridKnownClientsTool } from './getGridKnownClients.js';
import { registerGetGridOtoNatsTool } from './getGridOtoNats.js';
import { registerGetGridPolicyRoutingTool } from './getGridPolicyRouting.js';
import { registerGetGridSessionLimitRuleTool } from './getGridSessionLimitRule.js';
import { registerGetGridSignatureTool } from './getGridSignature.js';
import { registerGetGridStaticRoutingTool } from './getGridStaticRouting.js';
import { registerGetGridVirtualWanTool } from './getGridVirtualWan.js';
import { registerGetGroupPolicyDetailTool } from './getGroupPolicyDetail.js';
import { registerGetGroupProfilesByTypeTool } from './getGroupProfilesByType.js';
import { registerGetHotspotLocalUserTool } from './getHotspotLocalUser.js';
import { registerGetHotspotOperatorTool } from './getHotspotOperator.js';
import { registerGetHotspotStatisticsTool } from './getHotspotStatistics.js';
import { registerGetIgmpTool } from './getIgmp.js';
import { registerGetIncidentObjectRankingTool } from './getIncidentObjectRanking.js';
import { registerGetIncidentRankingTool } from './getIncidentRanking.js';
import { registerGetIntelliRecoverSettingTool } from './getIntelliRecoverSetting.js';
import { registerGetInterfaceLanNetworkTool } from './getInterfaceLanNetwork.js';
import { registerGetInterfaceLanNetworkV2Tool } from './getInterfaceLanNetworkV2.js';
import { registerGetInterferenceTool } from './getInterference.js';
import { registerGetInternetTool } from './getInternet.js';
import { registerGetInternetBasicPortInfoTool } from './getInternetBasicPortInfo.js';
import { registerGetInternetInfoTool } from './getInternetInfo.js';
import { registerGetInternetLoadBalanceTool } from './getInternetLoadBalance.js';
import { registerGetIotRadioSettingTool } from './getIotRadioSetting.js';
import { registerGetIpGroupProfileTool } from './getIpGroupProfile.js';
import { registerGetIpMacBindingGeneralSettingTool } from './getIpMacBindingGeneralSetting.js';
import { registerGetIpsConfigTool } from './getIpsConfig.js';
import { registerGetIpsecTunnelDetailTool } from './getIpsecTunnelDetail.js';
import { registerGetIpsecTunnelListTool } from './getIpsecTunnelList.js';
import { registerGetIpsecVpnStatsTool } from './getIpsecVpnStats.js';
import { registerGetIptvSettingTool } from './getIptvSetting.js';
import { registerGetIspBandScanTool } from './getIspBandScan.js';
import { registerGetIspLoadTool } from './getIspLoad.js';
import { registerGetLanClientCountTool } from './getLanClientCount.js';
import { registerGetLanDnsRulesTool } from './getLanDnsRules.js';
import { registerGetLanNetworkListTool } from './getLanNetworkList.js';
import { registerGetLanNetworkListV2Tool } from './getLanNetworkListV2.js';
import { registerGetLanProfileEsUsageTool } from './getLanProfileEsUsage.js';
import { registerGetLanProfileListTool } from './getLanProfileList.js';
import { registerGetLdapProfileListTool } from './getLdapProfileList.js';
import { registerGetLldpSettingTool } from './getLldpSetting.js';
import { registerGetLoggingTool } from './getLogging.js';
import { registerGetLogSettingForGlobalTool } from './getLogSettingForGlobal.js';
import { registerGetLogSettingForGlobalV2Tool } from './getLogSettingForGlobalV2.js';
import { registerGetLogSettingForSiteTool } from './getLogSettingForSite.js';
import { registerGetLogSettingForSiteV2Tool } from './getLogSettingForSiteV2.js';
import { registerGetLongestClientUptimeTool } from './getLongestClientUptime.js';
import { registerGetLtePortConfigTool } from './getLtePortConfig.js';
import { registerGetMacAuthSettingTool } from './getMacAuthSetting.js';
import { registerGetMacAuthSsidsTool } from './getMacAuthSsids.js';
import { registerGetMacFilterDetailTool } from './getMacFilterDetail.js';
import { registerGetMacFilteringGeneralSettingTool } from './getMacFilteringGeneralSetting.js';
import { registerGetMailServerStatusTool } from './getMailServerStatus.js';
import { registerGetMeshSettingTool } from './getMeshSetting.js';
import { registerGetMeshStatisticsTool } from './getMeshStatistics.js';
import { registerGetMfaStatusTool } from './getMfaStatus.js';
import { registerGetMldSettingTool } from './getMldSetting.js';
import { registerGetMostActiveAppsTool } from './getMostActiveApps.js';
import { registerGetMulticastRateLimitTool } from './getMulticastRateLimit.js';
import { registerGetNetworkHealthSummaryTool } from './getNetworkHealthSummary.js';
import { registerGetNetworkOverviewCardTool } from './getNetworkOverviewCard.js';
import { registerGetNtpSettingTool } from './getNtpSetting.js';
import { registerGetOsgCustomAclListTool } from './getOsgCustomAclList.js';
import { registerGetOspfInterfaceTool } from './getOspfInterface.js';
import { registerGetOspfNeighborsTool } from './getOspfNeighbors.js';
import { registerGetOspfProcessTool } from './getOspfProcess.js';
import { registerGetOswAclListTool } from './getOswAclList.js';
import { registerGetOswStackLagListTool } from './getOswStackLagList.js';
import { registerGetOuiProfileListTool } from './getOuiProfileList.js';
import { registerGetPastClientNumTool } from './getPastClientNum.js';
import { registerGetPoeScheduleListTool } from './getPoeScheduleList.js';
import { registerGetPortalCandidatesTool } from './getPortalCandidates.js';
import { registerGetPortalLogoutSettingTool } from './getPortalLogoutSetting.js';
import { registerGetPortalPortTool } from './getPortalPort.js';
import { registerGetPortalProfileTool } from './getPortalProfile.js';
import { registerGetPortForwardingListTool } from './getPortForwardingList.js';
import { registerGetPortForwardingStatusTool } from './getPortForwardingStatus.js';
import { registerGetPortScheduleListTool } from './getPortScheduleList.js';
import { registerGetPortSchedulePortsTool } from './getPortSchedulePorts.js';
import { registerGetPPSKProfilesTool } from './getPPSKProfiles.js';
import { registerGetPpskNetworkProfileTool } from './getPpskNetworkProfile.js';
import { registerGetPpskUserGroupTool } from './getPpskUserGroup.js';
import { registerGetPpskUserListTool } from './getPpskUserList.js';
import { registerGetPrivacyPolicyStatusTool } from './getPrivacyPolicyStatus.js';
import { registerGetQosMarkingRuleTool } from './getQosMarkingRule.js';
import { registerGetQosPolicyTool } from './getQosPolicy.js';
import { registerGetQosPolicyRuleTool } from './getQosPolicyRule.js';
import { registerGetQosProfileTool } from './getQosProfile.js';
import { registerGetRadioFrequencyPlanningConfigTool } from './getRadioFrequencyPlanningConfig.js';
import { registerGetRadioFrequencyPlanningResultTool } from './getRadioFrequencyPlanningResult.js';
import { registerGetRadiosConfigTool } from './getRadiosConfig.js';
import { registerGetRadiusProxyConfigTool } from './getRadiusProxyConfig.js';
import { registerGetRadiusServerTool } from './getRadiusServer.js';
import { registerGetRadiusUserDetailTool } from './getRadiusUserDetail.js';
import { registerGetRadiusUserListTool } from './getRadiusUserList.js';
import { registerGetRateLimitProfilesTool } from './getRateLimitProfiles.js';
import { registerGetRebootScheduleListTool } from './getRebootScheduleList.js';
import { registerGetRemoteBindingStatusTool } from './getRemoteBindingStatus.js';
import { registerGetRemoteLoggingTool } from './getRemoteLogging.js';
import { registerGetRemoteLoggingSettingTool } from './getRemoteLoggingSetting.js';
import { registerGetReportTabTool } from './getReportTab.js';
import { registerGetRestoreResultTool } from './getRestoreResult.js';
import { registerGetRetentionTool } from './getRetention.js';
import { registerGetRetryAndDroppedRateTool } from './getRetryAndDroppedRate.js';
import { registerGetRFScanResultTool } from './getRFScanResult.js';
import { registerGetRoamingSettingTool } from './getRoamingSetting.js';
import { registerGetRogueApExportTool } from './getRogueApExport.js';
import { registerGetRogueApsTool } from './getRogueAps.js';
import { registerGetRoleDetailTool } from './getRoleDetail.js';
import { registerGetRoutingTableTool } from './getRoutingTable.js';
import { registerGetScheduleProfileTool } from './getScheduleProfile.js';
import { registerGetSecurityOverviewTool } from './getSecurityOverview.js';
import { registerGetServiceProfileTool } from './getServiceProfile.js';
import { registerGetServiceTypeSummaryTool } from './getServiceTypeSummary.js';
import { registerGetSessionLimitTool } from './getSessionLimit.js';
import { registerGetSiteBackupFileListTool } from './getSiteBackupFileList.js';
import { registerGetSiteBackupResultTool } from './getSiteBackupResult.js';
import { registerGetSiteCapacityTool } from './getSiteCapacity.js';
import { registerGetSiteDetailTool } from './getSiteDetail.js';
import { registerGetSiteDeviceAccountTool } from './getSiteDeviceAccount.js';
import { registerGetSiteDstInfoTool } from './getSiteDstInfo.js';
import { registerGetSiteHealthOverviewTool } from './getSiteHealthOverview.js';
import { registerGetSiteJumboTool } from './getSiteJumbo.js';
import { registerGetSiteLagHashAlgorithmTool } from './getSiteLagHashAlgorithm.js';
import { registerGetSiteMailServerTool } from './getSiteMailServer.js';
import { registerGetSiteNtpStatusTool } from './getSiteNtpStatus.js';
import { registerGetSiteOverridesTool } from './getSiteOverrides.js';
import { registerGetSiteRememberSettingTool } from './getSiteRememberSetting.js';
import { registerGetSiteSpecificationTool } from './getSiteSpecification.js';
import { registerGetSitesApsAvailableChannelTool } from './getSitesApsAvailableChannel.js';
import { registerGetSitesApsBridgeTool } from './getSitesApsBridge.js';
import { registerGetSitesApsChannelLimitTool } from './getSitesApsChannelLimit.js';
import { registerGetSitesApsIpSettingTool } from './getSitesApsIpSetting.js';
import { registerGetSitesApsLoadBalanceTool } from './getSitesApsLoadBalance.js';
import { registerGetSitesApsOfdmaTool } from './getSitesApsOfdma.js';
import { registerGetSitesApsPowerSavingTool } from './getSitesApsPowerSaving.js';
import { registerGetSitesApsTrunkSettingTool } from './getSitesApsTrunkSetting.js';
import { registerGetSitesDeviceWhiteListTool } from './getSitesDeviceWhiteList.js';
import { registerGetSitesGatewaysGeneralConfigTool } from './getSitesGatewaysGeneralConfig.js';
import { registerGetSitesGatewaysPinTool } from './getSitesGatewaysPin.js';
import { registerGetSitesGatewaysSimCardUsedTool } from './getSitesGatewaysSimCardUsed.js';
import { registerGetSitesHealthGatewaysWansDetailsTool } from './getSitesHealthGatewaysWansDetails.js';
import { registerGetSitesSwitchesEsTool } from './getSitesSwitchesEs.js';
import { registerGetSitesSwitchesEsGeneralConfigTool } from './getSitesSwitchesEsGeneralConfig.js';
import { registerGetSiteTemplateCapacityTool } from './getSiteTemplateCapacity.js';
import { registerGetSiteTemplateConfigTool } from './getSiteTemplateConfig.js';
import { registerGetSiteTemplateDetailTool } from './getSiteTemplateDetail.js';
import { registerGetSiteTemplateListTool } from './getSiteTemplateList.js';
import { registerGetSiteTemplateSpecificationTool } from './getSiteTemplateSpecification.js';
import { registerGetSiteToSiteVpnInfoTool } from './getSiteToSiteVpnInfo.js';
import { registerGetSiteUrlTool } from './getSiteUrl.js';
import { registerGetSnmpSettingTool } from './getSnmpSetting.js';
import { registerGetSpeedTestResultsTool } from './getSpeedTestResults.js';
import { registerGetSpeedTestSettingTool } from './getSpeedTestSetting.js';
import { registerGetSshSettingTool } from './getSshSetting.js';
import { registerGetSsidConfigTool } from './getSsidConfig.js';
import { registerGetSsidDetailTool } from './getSsidDetail.js';
import { registerGetSsidListTool } from './getSsidList.js';
import { registerGetSsidsBySiteTool } from './getSsidsBySite.js';
import { registerGetSslVpnServerSettingTool } from './getSslVpnServerSetting.js';
import { registerGetStackNetworkListTool } from './getStackNetworkList.js';
import { registerGetStackPortsTool } from './getStackPorts.js';
import { registerGetStaticRoutingInterfaceListTool } from './getStaticRoutingInterfaceList.js';
import { registerGetSurveyResultTool } from './getSurveyResult.js';
import { registerGetSwitchDdmInfoTool } from './getSwitchDdmInfo.js';
import { registerGetSwitchDetailTool } from './getSwitchDetail.js';
import { registerGetSwitchDot1xSettingTool } from './getSwitchDot1xSetting.js';
import { registerGetSwitchExistingNetworksTool } from './getSwitchExistingNetworks.js';
import { registerGetSwitchGeneralConfigTool } from './getSwitchGeneralConfig.js';
import { registerGetSwitchHealthDetailTool } from './getSwitchHealthDetail.js';
import { registerGetSwitchHealthTimelineTool } from './getSwitchHealthTimeline.js';
import { registerGetSwitchInterfacesBriefTool } from './getSwitchInterfacesBrief.js';
import { registerGetSwitchOuiAutoAddVlanTool } from './getSwitchOuiAutoAddVlan.js';
import { registerGetSwitchOuiAutoAddVlanAllSupportTool } from './getSwitchOuiAutoAddVlanAllSupport.js';
import { registerGetSwitchPortViewTool } from './getSwitchPortView.js';
import { registerGetSwitchStackDetailTool } from './getSwitchStackDetail.js';
import { registerGetSwitchVlanInterfaceTool } from './getSwitchVlanInterface.js';
import { registerGetSyslogConfigTool } from './getSyslogConfig.js';
import { registerGetThreatCategoryCountsTool } from './getThreatCategoryCounts.js';
import { registerGetThreatCountTool } from './getThreatCount.js';
import { registerGetThreatDetailTool } from './getThreatDetail.js';
import { registerGetThreatListTool } from './getThreatList.js';
import { registerGetThreatMapTool } from './getThreatMap.js';
import { registerGetTopApsTool } from './getTopAps.js';
import { registerGetTopThreatsTool } from './getTopThreats.js';
import { registerGetTrafficDistributionTool } from './getTrafficDistribution.js';
import { registerGetTrafficPriorityTool } from './getTrafficPriority.js';
import { registerGetTrafficStatsTool } from './getTrafficStats.js';
import { registerGetUiInterfaceTool } from './getUiInterface.js';
import { registerGetUnresolvedIncidentCountTool } from './getUnresolvedIncidentCount.js';
import { registerGetUpgradeLogsTool } from './getUpgradeLogs.js';
import { registerGetUpgradeOverviewCriticalTool } from './getUpgradeOverviewCritical.js';
import { registerGetUpgradeOverviewTryBetaTool } from './getUpgradeOverviewTryBeta.js';
import { registerGetUpgradePortTool } from './getUpgradePort.js';
import { registerGetUpgradeScheduleListTool } from './getUpgradeScheduleList.js';
import { registerGetUplinkWiredDetailTool } from './getUplinkWiredDetail.js';
import { registerGetUpnpSettingTool } from './getUpnpSetting.js';
import { registerGetUrlFilterBlacklistTool } from './getUrlFilterBlacklist.js';
import { registerGetUrlFilterGeneralTool } from './getUrlFilterGeneral.js';
import { registerGetUrlFilterRulesTool } from './getUrlFilterRules.js';
import { registerGetUrlFilterWhitelistTool } from './getUrlFilterWhitelist.js';
import { registerGetUrlGroupProfileTool } from './getUrlGroupProfile.js';
import { registerGetUserRoleProfileTool } from './getUserRoleProfile.js';
import { registerGetVlanProfileTool } from './getVlanProfile.js';
import { registerGetVoucherTool } from './getVoucher.js';
import { registerGetVoucherDurationDistributionTool } from './getVoucherDurationDistribution.js';
import { registerGetVoucherGroupConfigLimitTool } from './getVoucherGroupConfigLimit.js';
import { registerGetVoucherGroupDetailTool } from './getVoucherGroupDetail.js';
import { registerGetVoucherGroupSummaryTool } from './getVoucherGroupSummary.js';
import { registerGetVoucherHistoryStatisticsTool } from './getVoucherHistoryStatistics.js';
import { registerGetVoucherPriceDistributionTool } from './getVoucherPriceDistribution.js';
import { registerGetVoucherSummaryTool } from './getVoucherSummary.js';
import { registerGetVpnClientStatusTool } from './getVpnClientStatus.js';
import { registerGetVpnRouteConfigTool } from './getVpnRouteConfig.js';
import { registerGetVpnSettingsTool } from './getVpnSettings.js';
import { registerGetVpnTunnelStatsTool } from './getVpnTunnelStats.js';
import { registerGetVpnUserDetailTool } from './getVpnUserDetail.js';
import { registerGetVpnUserListTool } from './getVpnUserList.js';
import { registerGetVrrpConfigTool } from './getVrrpConfig.js';
import { registerGetWanHealthDetailTool } from './getWanHealthDetail.js';
import { registerGetWanIspProfileTool } from './getWanIspProfile.js';
import { registerGetWanLanStatusTool } from './getWanLanStatus.js';
import { registerGetWanNatConfigTool } from './getWanNatConfig.js';
import { registerGetWanPortDetailTool } from './getWanPortDetail.js';
import { registerGetWanPortsConfigTool } from './getWanPortsConfig.js';
import { registerGetWanQosConfigTool } from './getWanQosConfig.js';
import { registerGetWanUsageStatsTool } from './getWanUsageStats.js';
import { registerGetWebhookForGlobalTool } from './getWebhookForGlobal.js';
import { registerGetWebhookLogsForGlobalTool } from './getWebhookLogsForGlobal.js';
import { registerGetWidsTool } from './getWids.js';
import { registerGetWidsBlacklistTool } from './getWidsBlacklist.js';
import { registerGetWifiHealthSummaryTool } from './getWifiHealthSummary.js';
import { registerGetWifiHealthTimelineTool } from './getWifiHealthTimeline.js';
import { registerGetWifiSubHealthTimelineTool } from './getWifiSubHealthTimeline.js';
import { registerGetWireguardSummaryTool } from './getWireguardSummary.js';
import { registerGetWirelessIdsConfigTool } from './getWirelessIdsConfig.js';
import { registerGetWirelessIpsConfigTool } from './getWirelessIpsConfig.js';
import { registerGetWlanGroupListTool } from './getWlanGroupList.js';
import { registerListAllowedAppsTool } from './listAllowedApps.js';
import { registerListAllSsidsTool } from './listAllSsids.js';
import { registerListAnomalyIncidentsTool } from './listAnomalyIncidents.js';
import { registerListAnomalySettingsTool } from './listAnomalySettings.js';
import { registerListApGroupApsTool } from './listApGroupAps.js';
import { registerListApGroupsTool } from './listApGroups.js';
import { registerListApnProfilesTool } from './listApnProfiles.js';
import { registerListApPortVlansTool } from './listApPortVlans.js';
import { registerListAppCategoriesTool } from './listAppCategories.js';
import { registerListApSsidOverrideAuditLogsTool } from './listApSsidOverrideAuditLogs.js';
import { registerListAuthSurveysTool } from './listAuthSurveys.js';
import { registerListBlockedAppsTool } from './listBlockedApps.js';
import { registerListBlockedCountriesTool } from './listBlockedCountries.js';
import { registerListClientsTool } from './listClients.js';
import { registerListClientsActivityTool } from './listClientsActivity.js';
import { registerListClientsPastConnectionsTool } from './listClientsPastConnections.js';
import { registerListClientToSiteVpnClientsTool } from './listClientToSiteVpnClients.js';
import { registerListClientToSiteVpnServersTool } from './listClientToSiteVpnServers.js';
import { registerListClientTrafficTool } from './listClientTraffic.js';
import { registerListCountryThreatsTool } from './listCountryThreats.js';
import { registerListDashboardTabsTool } from './listDashboardTabs.js';
import { registerListDashboardTabsWithoutOverallTool } from './listDashboardTabsWithoutOverall.js';
import { registerListDeviceIncidentsTool } from './listDeviceIncidents.js';
import { registerListDevicesTool } from './listDevices.js';
import { registerListDevicesStatsTool } from './listDevicesStats.js';
import { registerListDuplicateSsidNamesTool } from './listDuplicateSsidNames.js';
import { registerListEapAclsTool } from './listEapAcls.js';
import { registerListExternalUserGroupsTool } from './listExternalUserGroups.js';
import { registerListExternalUsersTool } from './listExternalUsers.js';
import { registerListFailedUpgradeDevicesTool } from './listFailedUpgradeDevices.js';
import { registerListGlobalAlertsTool } from './listGlobalAlerts.js';
import { registerListGlobalEventsTool } from './listGlobalEvents.js';
import { registerListGlobalGatewayWanStatusTool } from './listGlobalGatewayWanStatus.js';
import { registerListGroupProfilesTool } from './listGroupProfiles.js';
import { registerListHotspotAuthRecordsTool } from './listHotspotAuthRecords.js';
import { registerListHotspotLocalUsersTool } from './listHotspotLocalUsers.js';
import { registerListHotspotOperatorsTool } from './listHotspotOperators.js';
import { registerListHotspotRateLimitProfilesTool } from './listHotspotRateLimitProfiles.js';
import { registerListInfluencingClientsTool } from './listInfluencingClients.js';
import { registerListInfluencingDevicesTool } from './listInfluencingDevices.js';
import { registerListIotServersTool } from './listIotServers.js';
import { registerListLockToApApsTool } from './listLockToApAps.js';
import { registerListMdnsProfileTool } from './listMdnsProfile.js';
import { registerListMdnsRulesTool } from './listMdnsRules.js';
import { registerListMostActiveClientsTool } from './listMostActiveClients.js';
import { registerListMostActiveEapsByTrafficTool } from './listMostActiveEapsByTraffic.js';
import { registerListOsgAclsTool } from './listOsgAcls.js';
import { registerListOuiProfileSummariesTool } from './listOuiProfileSummaries.js';
import { registerListPendingDevicesTool } from './listPendingDevices.js';
import { registerListPlacedSitePositionsTool } from './listPlacedSitePositions.js';
import { registerListPolicyRoutesTool } from './listPolicyRoutes.js';
import { registerListPortalsWithLogoutTool } from './listPortalsWithLogout.js';
import { registerListPortForwardingRulesTool } from './listPortForwardingRules.js';
import { registerListRadiusProfilesTool } from './listRadiusProfiles.js';
import { registerListReportTabsTool } from './listReportTabs.js';
import { registerListSamlIdpsTool } from './listSamlIdps.js';
import { registerListScenariosTool } from './listScenarios.js';
import { registerListServiceTypeTool } from './listServiceType.js';
import { registerListSiteAlertsTool } from './listSiteAlerts.js';
import { registerListSiteAuditLogsTool } from './listSiteAuditLogs.js';
import { registerListSiteEventsTool } from './listSiteEvents.js';
import { registerListSitesTool } from './listSites.js';
import { registerListSitesApsPortsTool } from './listSitesApsPorts.js';
import { registerListSitesAvailableForTemplateTool } from './listSitesAvailableForTemplate.js';
import { registerListSitesCableTestSwitchesIncrementResultsTool } from './listSitesCableTestSwitchesIncrementResults.js';
import { registerListSitesCableTestSwitchesPortsTool } from './listSitesCableTestSwitchesPorts.js';
import { registerListSitesSettingIotDevicesTool } from './listSitesSettingIotDevices.js';
import { registerListSitesStacksTool } from './listSitesStacks.js';
import { registerListSiteTagsTool } from './listSiteTags.js';
import { registerListSiteTemplateAllModulesTool } from './listSiteTemplateAllModules.js';
import { registerListSiteTemplateBoundSitesTool } from './listSiteTemplateBoundSites.js';
import { registerListSiteTemplateModulesTool } from './listSiteTemplateModules.js';
import { registerListSiteThreatManagementTool } from './listSiteThreatManagement.js';
import { registerListSiteToSiteVpnPeerStatusTool } from './listSiteToSiteVpnPeerStatus.js';
import { registerListSiteToSiteVpnStatusTool } from './listSiteToSiteVpnStatus.js';
import { registerListSiteToSiteVpnsTool } from './listSiteToSiteVpns.js';
import { registerListSsidApGroupsTool } from './listSsidApGroups.js';
import { registerListSslVpnLocksTool } from './listSslVpnLocks.js';
import { registerListSslVpnResourceGroupsTool } from './listSslVpnResourceGroups.js';
import { registerListSslVpnResourcesTool } from './listSslVpnResources.js';
import { registerListSslVpnUserGroupsTool } from './listSslVpnUserGroups.js';
import { registerListSslVpnUserGroupUsersTool } from './listSslVpnUserGroupUsers.js';
import { registerListStackIncidentsTool } from './listStackIncidents.js';
import { registerListStaticRoutesTool } from './listStaticRoutes.js';
import { registerListSurveyResultsTool } from './listSurveyResults.js';
import { registerListSwitchDhcpUsersTool } from './listSwitchDhcpUsers.js';
import { registerListSwitchInterfacesTool } from './listSwitchInterfaces.js';
import { registerListSwitchLldpNeighborsTool } from './listSwitchLldpNeighbors.js';
import { registerListSwitchNetworksTool } from './listSwitchNetworks.js';
import { registerListSwitchNetworksDetailTool } from './listSwitchNetworksDetail.js';
import { registerListSwitchOuiAutoAddVlanSwitchesTool } from './listSwitchOuiAutoAddVlanSwitches.js';
import { registerListSwitchOuiRuleSwitchesTool } from './listSwitchOuiRuleSwitches.js';
import { registerListSwitchOuiRulesTool } from './listSwitchOuiRules.js';
import { registerListSwitchOuiSupportedSwitchesTool } from './listSwitchOuiSupportedSwitches.js';
import { registerListSwitchOuiValidVlansTool } from './listSwitchOuiValidVlans.js';
import { registerListSwitchPortCountersTool } from './listSwitchPortCounters.js';
import { registerListSwitchPortLagNetworksTool } from './listSwitchPortLagNetworks.js';
import { registerListSwitchPortOverviewTool } from './listSwitchPortOverview.js';
import { registerListSwitchPortPoeInfoTool } from './listSwitchPortPoeInfo.js';
import { registerListSwitchPortTagsTool } from './listSwitchPortTags.js';
import { registerListTimeRangeProfilesTool } from './listTimeRangeProfiles.js';
import { registerListUnplacedSitePositionsTool } from './listUnplacedSitePositions.js';
import { registerListUnusedVoucherCodesTool } from './listUnusedVoucherCodes.js';
import { registerListUpgradeFirmwaresTool } from './listUpgradeFirmwares.js';
import { registerListUpgradeOverviewFirmwaresTool } from './listUpgradeOverviewFirmwares.js';
import { registerListVoucherCurrenciesTool } from './listVoucherCurrencies.js';
import { registerListVoucherGroupOptionsTool } from './listVoucherGroupOptions.js';
import { registerListVoucherGroupsTool } from './listVoucherGroups.js';
import { registerListVpnClientStatusTool } from './listVpnClientStatus.js';
import { registerListVpnServerClientStatusTool } from './listVpnServerClientStatus.js';
import { registerListVpnServerStatusTool } from './listVpnServerStatus.js';
import { registerListVpnUsersTool } from './listVpnUsers.js';
import { registerListWifiCallingProfilesTool } from './listWifiCallingProfiles.js';
import { registerListWifiHealthTopClientsTool } from './listWifiHealthTopClients.js';
import { registerListWireguardTool } from './listWireguard.js';
import { registerListWireguardPeersTool } from './listWireguardPeers.js';
import { registerLocateDeviceTool } from './locateDevice.js';
import { registerRebootDeviceTool } from './rebootDevice.js';
import { registerReconnectClientTool } from './reconnectClient.js';
import { registerRecoverSwitchPortPoeTool } from './recoverSwitchPortPoe.js';
import { registerRenameDashboardTabTool } from './renameDashboardTab.js';
import { registerRenameSiteTemplateTool } from './renameSiteTemplate.js';
import { registerResetDashboardTabTool } from './resetDashboardTab.js';
import { registerResetGlobalLogNotificationsTool } from './resetGlobalLogNotifications.js';
import { registerResetSiteLogNotificationsTool } from './resetSiteLogNotifications.js';
import { registerResolveSiteAlertsTool } from './resolveSiteAlerts.js';
import { registerRestoreControllerTool } from './restoreController.js';
import { registerRestoreControllerFromFileServerTool } from './restoreControllerFromFileServer.js';
import { registerRestoreSitesTool } from './restoreSites.js';
import { registerRestoreSitesFromFileServerTool } from './restoreSitesFromFileServer.js';
import { registerSearchClientTrafficTool } from './searchClientTraffic.js';
import { registerSearchDevicesTool } from './searchDevices.js';
import { registerSendTestMailTool } from './sendTestMail.js';
import { registerSetAccessControlTool } from './setAccessControl.js';
import { registerSetAclConfigTypeSettingTool } from './setAclConfigTypeSetting.js';
import { registerSetAlgSettingTool } from './setAlgSetting.js';
import { registerSetAnomalyEventSettingTool } from './setAnomalyEventSetting.js';
import { registerSetAnomalyNotificationTool } from './setAnomalyNotification.js';
import { registerSetApChannelLimitTool } from './setApChannelLimit.js';
import { registerSetApConfigTool } from './setApConfig.js';
import { registerSetApPowerSavingTool } from './setApPowerSaving.js';
import { registerSetAppControlRuleTool } from './setAppControlRule.js';
import { registerSetApRadioTool } from './setApRadio.js';
import { registerSetApSsidOverridesTool } from './setApSsidOverrides.js';
import { registerSetAttackDefenseSettingTool } from './setAttackDefenseSetting.js';
import { registerSetBackupScheduleTool } from './setBackupSchedule.js';
import { registerSetBandwidthControlRuleTool } from './setBandwidthControlRule.js';
import { registerSetClientActiveTimeoutTool } from './setClientActiveTimeout.js';
import { registerSetClientDetailInformationTool } from './setClientDetailInformation.js';
import { registerSetClientLockToApTool } from './setClientLockToAp.js';
import { registerSetClientNameTool } from './setClientName.js';
import { registerSetClientRateLimitTool } from './setClientRateLimit.js';
import { registerSetClientRateLimitProfileTool } from './setClientRateLimitProfile.js';
import { registerSetClientRecognitionTool } from './setClientRecognition.js';
import { registerSetControllerLoggingTool } from './setControllerLogging.js';
import { registerSetControllerRetentionTool } from './setControllerRetention.js';
import { registerSetDashboardTabCardsTool } from './setDashboardTabCards.js';
import { registerSetDataRetentionTool } from './setDataRetention.js';
import { registerSetDeviceAccessManagementTool } from './setDeviceAccessManagement.js';
import { registerSetDeviceLedTool } from './setDeviceLed.js';
import { registerSetEoGreTunnelConfigTool } from './setEoGreTunnelConfig.js';
import { registerSetExperienceImprovementTool } from './setExperienceImprovement.js';
import { registerSetFirewallSettingTool } from './setFirewallSetting.js';
import { registerSetGatewayConfigTool } from './setGatewayConfig.js';
import { registerSetGeneralSettingsTool } from './setGeneralSettings.js';
import { registerSetGlobalAuditNotificationsTool } from './setGlobalAuditNotifications.js';
import { registerSetGlobalLogNotificationsTool } from './setGlobalLogNotifications.js';
import { registerSetIncidentStatusTool } from './setIncidentStatus.js';
import { registerSetIntelliRecoverSettingTool } from './setIntelliRecoverSetting.js';
import { registerSetIotRadioSettingTool } from './setIotRadioSetting.js';
import { registerSetIpsConfigTool } from './setIpsConfig.js';
import { registerSetMfaStatusTool } from './setMfaStatus.js';
import { registerSetMulticastRateLimitTool } from './setMulticastRateLimit.js';
import { registerSetPortalLogoutSettingTool } from './setPortalLogoutSetting.js';
import { registerSetRadiusProxyTool } from './setRadiusProxy.js';
import { registerSetRadiusServerTool } from './setRadiusServer.js';
import { registerSetRemoteLoggingTool } from './setRemoteLogging.js';
import { registerSetSiteAuditNotificationsTool } from './setSiteAuditNotifications.js';
import { registerSetSiteDeviceAccountTool } from './setSiteDeviceAccount.js';
import { registerSetSiteJumboTool } from './setSiteJumbo.js';
import { registerSetSiteLagHashAlgorithmTool } from './setSiteLagHashAlgorithm.js';
import { registerSetSiteLedTool } from './setSiteLed.js';
import { registerSetSiteLogNotificationsTool } from './setSiteLogNotifications.js';
import { registerSetSiteMailServerTool } from './setSiteMailServer.js';
import { registerSetSiteRememberSettingTool } from './setSiteRememberSetting.js';
import { registerSetSnmpSettingTool } from './setSnmpSetting.js';
import { registerSetSpeedTestSettingTool } from './setSpeedTestSetting.js';
import { registerSetSsidApGroupsTool } from './setSsidApGroups.js';
import { registerSetSsidConfigTool } from './setSsidConfig.js';
import { registerSetSwitchGeneralConfigTool } from './setSwitchGeneralConfig.js';
import { registerSetSwitchPortsTool } from './setSwitchPorts.js';
import { registerSetUiInterfaceTool } from './setUiInterface.js';
import { registerSetUpnpSettingTool } from './setUpnpSetting.js';
import { registerSetVoucherCurrencyTool } from './setVoucherCurrency.js';
import { registerSetVoucherGroupPatternTool } from './setVoucherGroupPattern.js';
import { registerSetWirelessIdsConfigTool } from './setWirelessIdsConfig.js';
import { registerSetWirelessIpsConfigTool } from './setWirelessIpsConfig.js';
import { withSiteTemplateOption } from './siteTemplateOption.js';
import { registerStartApRfScanTool } from './startApRfScan.js';
import { registerStartDeviceOnlineUpgradeTool } from './startDeviceOnlineUpgrade.js';
import { registerStartSwitchCableTestTool } from './startSwitchCableTest.js';
import { registerSyncSitesWithTemplateTool } from './syncSitesWithTemplate.js';
import { registerTestWebhookTool } from './testWebhook.js';
import { registerUnauthorizeHotspotClientTool } from './unauthorizeHotspotClient.js';
import { registerUnbindSitesFromTemplateTool } from './unbindSitesFromTemplate.js';
import { registerUnblockClientTool } from './unblockClient.js';
import { registerUnblockCountryTool } from './unblockCountry.js';
import { registerUpdateApGroupTool } from './updateApGroup.js';
import { registerUpdateApnProfileTool } from './updateApnProfile.js';
import { registerUpdateAuthSurveyTool } from './updateAuthSurvey.js';
import { registerUpdateClientToSiteVpnClientTool } from './updateClientToSiteVpnClient.js';
import { registerUpdateClientToSiteVpnServerTool } from './updateClientToSiteVpnServer.js';
import { registerUpdateDdnsEntryTool } from './updateDdnsEntry.js';
import { registerUpdateDhcpReservationTool } from './updateDhcpReservation.js';
import { registerUpdateEapAclTool } from './updateEapAcl.js';
import { registerUpdateExternalUserGroupTool } from './updateExternalUserGroup.js';
import { registerUpdateGatewayAclTool } from './updateGatewayAcl.js';
import { registerUpdateGroupProfileTool } from './updateGroupProfile.js';
import { registerUpdateHotspotLocalUserTool } from './updateHotspotLocalUser.js';
import { registerUpdateHotspotOperatorTool } from './updateHotspotOperator.js';
import { registerUpdateIotServerTool } from './updateIotServer.js';
import { registerUpdateIpMacBindingTool } from './updateIpMacBinding.js';
import { registerUpdateIpsAllowEntryTool } from './updateIpsAllowEntry.js';
import { registerUpdateIpsSignatureTool } from './updateIpsSignature.js';
import { registerUpdateLanDnsRuleTool } from './updateLanDnsRule.js';
import { registerUpdateLanNetworkTool } from './updateLanNetwork.js';
import { registerUpdateLanProfileTool } from './updateLanProfile.js';
import { registerUpdateLdapProfileTool } from './updateLdapProfile.js';
import { registerUpdateMacFilterTool } from './updateMacFilter.js';
import { registerUpdateMdnsProfileTool } from './updateMdnsProfile.js';
import { registerUpdateMdnsRuleTool } from './updateMdnsRule.js';
import { registerUpdateOneToOneNatTool } from './updateOneToOneNat.js';
import { registerUpdateOuiProfileTool } from './updateOuiProfile.js';
import { registerUpdatePoeScheduleTool } from './updatePoeSchedule.js';
import { registerUpdatePolicyRouteTool } from './updatePolicyRoute.js';
import { registerUpdatePortForwardingRuleTool } from './updatePortForwardingRule.js';
import { registerUpdatePortScheduleTool } from './updatePortSchedule.js';
import { registerUpdateRadiusProfileTool } from './updateRadiusProfile.js';
import { registerUpdateRadiusUserTool } from './updateRadiusUser.js';
import { registerUpdateRateLimitProfileTool } from './updateRateLimitProfile.js';
import { registerUpdateReportTabTool } from './updateReportTab.js';
import { registerUpdateRoleTool } from './updateRole.js';
import { registerUpdateSamlIdpTool } from './updateSamlIdp.js';
import { registerUpdateServiceTypeTool } from './updateServiceType.js';
import { registerUpdateSiteTool } from './updateSite.js';
import { registerUpdateSiteTagTool } from './updateSiteTag.js';
import { registerUpdateSiteToSiteVpnTool } from './updateSiteToSiteVpn.js';
import { registerUpdateSsidTool } from './updateSsid.js';
import { registerUpdateSslVpnLockTool } from './updateSslVpnLock.js';
import { registerUpdateSslVpnResourceTool } from './updateSslVpnResource.js';
import { registerUpdateSslVpnResourceGroupTool } from './updateSslVpnResourceGroup.js';
import { registerUpdateSslVpnUserGroupTool } from './updateSslVpnUserGroup.js';
import { registerUpdateStaticRouteTool } from './updateStaticRoute.js';
import { registerUpdateSwitchAclTool } from './updateSwitchAcl.js';
import { registerUpdateSwitchPortTagTool } from './updateSwitchPortTag.js';
import { registerUpdateTimeRangeProfileTool } from './updateTimeRangeProfile.js';
import { registerUpdateUrlFilterRuleTool } from './updateUrlFilterRule.js';
import { registerUpdateVpnUserTool } from './updateVpnUser.js';
import { registerUpdateWebhookTool } from './updateWebhook.js';
import { registerUpdateWifiCallingProfileTool } from './updateWifiCallingProfile.js';
import { registerUpdateWireguardTool } from './updateWireguard.js';
import { registerUpdateWlanGroupTool } from './updateWlanGroup.js';

// ---------------------------------------------------------------------------
// Tool registry: each entry maps a register-function to its category and
// permission type ('read' for pure read operations, 'write' for mutations).
// ---------------------------------------------------------------------------

interface ToolEntry {
    fn: (server: McpServer, client: OmadaClient) => void;
    category: ToolCategory;
    permission: ToolPermission;
}

const TOOL_REGISTRY: ToolEntry[] = [
    { fn: registerSetSwitchPortsTool, category: 'devices-switch', permission: 'write' },
    { fn: registerSetApRadioTool, category: 'devices-ap', permission: 'write' },
    { fn: registerUpdateSsidTool, category: 'wireless-ssid', permission: 'write' },
    { fn: registerDiagnoseCameraConnectivityTool, category: 'client-insights', permission: 'read' },
    { fn: registerDiagnoseLogsTool, category: 'logs', permission: 'read' },
    { fn: registerGetWifiHealthSummaryTool, category: 'wireless-radio', permission: 'read' },
    // --- Sites ---
    { fn: registerListSitesTool, category: 'sites', permission: 'read' },
    { fn: registerGetSiteDetailTool, category: 'sites', permission: 'read' },
    { fn: registerGetSiteUrlTool, category: 'sites', permission: 'read' },
    { fn: registerGetSiteNtpStatusTool, category: 'sites', permission: 'read' },
    { fn: registerGetSiteSpecificationTool, category: 'sites', permission: 'read' },
    { fn: registerGetSiteRememberSettingTool, category: 'sites', permission: 'read' },
    { fn: registerGetSiteDeviceAccountTool, category: 'sites', permission: 'read' },
    { fn: registerGetSiteCapacityTool, category: 'sites', permission: 'read' },
    { fn: registerListSiteTagsTool, category: 'sites', permission: 'read' },
    { fn: registerListScenariosTool, category: 'sites', permission: 'read' },
    { fn: registerListPlacedSitePositionsTool, category: 'sites', permission: 'read' },
    { fn: registerListUnplacedSitePositionsTool, category: 'sites', permission: 'read' },
    { fn: registerGetSiteOverridesTool, category: 'sites', permission: 'read' },
    { fn: registerGetSiteHealthOverviewTool, category: 'sites', permission: 'read' },
    { fn: registerGetSiteJumboTool, category: 'sites', permission: 'read' },
    { fn: registerGetSiteLagHashAlgorithmTool, category: 'sites', permission: 'read' },
    { fn: registerCreateSiteTool, category: 'sites', permission: 'write' },
    { fn: registerUpdateSiteTool, category: 'sites', permission: 'write' },
    { fn: registerDeleteSiteTool, category: 'sites', permission: 'write' },
    { fn: registerCreateSiteTagTool, category: 'sites', permission: 'write' },
    { fn: registerUpdateSiteTagTool, category: 'sites', permission: 'write' },
    { fn: registerDeleteSiteTagTool, category: 'sites', permission: 'write' },
    { fn: registerCreateScenarioTool, category: 'sites', permission: 'write' },
    { fn: registerDeleteScenarioTool, category: 'sites', permission: 'write' },
    { fn: registerSetSiteJumboTool, category: 'sites', permission: 'write' },
    { fn: registerSetSiteLagHashAlgorithmTool, category: 'sites', permission: 'write' },
    { fn: registerSetSiteDeviceAccountTool, category: 'sites', permission: 'write' },
    { fn: registerListSiteTemplateModulesTool, category: 'sites', permission: 'read' },
    { fn: registerListSiteTemplateAllModulesTool, category: 'sites', permission: 'read' },
    { fn: registerGetSiteTemplateSpecificationTool, category: 'sites', permission: 'read' },
    { fn: registerGetSiteTemplateCapacityTool, category: 'sites', permission: 'read' },
    { fn: registerListSiteTemplateBoundSitesTool, category: 'sites', permission: 'read' },
    { fn: registerListSitesAvailableForTemplateTool, category: 'sites', permission: 'read' },
    { fn: registerCreateSiteTemplateTool, category: 'sites', permission: 'write' },
    { fn: registerRenameSiteTemplateTool, category: 'sites', permission: 'write' },
    { fn: registerDeleteSiteTemplateTool, category: 'sites', permission: 'write' },
    { fn: registerCopySiteTemplateTool, category: 'sites', permission: 'write' },
    { fn: registerCreateSiteFromTemplateTool, category: 'sites', permission: 'write' },
    { fn: registerBindSiteToTemplateTool, category: 'sites', permission: 'write' },
    { fn: registerUnbindSitesFromTemplateTool, category: 'sites', permission: 'write' },
    { fn: registerSyncSitesWithTemplateTool, category: 'sites', permission: 'write' },
    { fn: registerGetClientRecognitionTool, category: 'controller', permission: 'read' },
    { fn: registerGetClientDetailInformationTool, category: 'controller', permission: 'read' },
    { fn: registerGetControllerDstInfoTool, category: 'controller', permission: 'read' },
    { fn: registerGetSiteDstInfoTool, category: 'controller', permission: 'read' },
    { fn: registerGetPrivacyPolicyStatusTool, category: 'controller', permission: 'read' },
    { fn: registerGetUpgradePortTool, category: 'controller', permission: 'read' },
    { fn: registerListGlobalGatewayWanStatusTool, category: 'controller', permission: 'read' },
    { fn: registerSetClientActiveTimeoutTool, category: 'controller', permission: 'write' },
    { fn: registerSetControllerRetentionTool, category: 'controller', permission: 'write' },
    { fn: registerSetDataRetentionTool, category: 'controller', permission: 'write' },
    { fn: registerSetDeviceAccessManagementTool, category: 'controller', permission: 'write' },
    { fn: registerSetUiInterfaceTool, category: 'controller', permission: 'write' },
    { fn: registerSetExperienceImprovementTool, category: 'controller', permission: 'write' },
    { fn: registerSetGeneralSettingsTool, category: 'controller', permission: 'write' },
    { fn: registerSetRadiusProxyTool, category: 'controller', permission: 'write' },
    { fn: registerSetRemoteLoggingTool, category: 'controller', permission: 'write' },
    { fn: registerSetControllerLoggingTool, category: 'controller', permission: 'write' },
    { fn: registerSetClientRecognitionTool, category: 'controller', permission: 'write' },
    { fn: registerSetClientDetailInformationTool, category: 'controller', permission: 'write' },
    { fn: registerCreateWebhookTool, category: 'controller', permission: 'write' },
    { fn: registerUpdateWebhookTool, category: 'controller', permission: 'write' },
    { fn: registerDeleteWebhookTool, category: 'controller', permission: 'write' },
    { fn: registerTestWebhookTool, category: 'controller', permission: 'write' },
    { fn: registerSendTestMailTool, category: 'controller', permission: 'write' },
    { fn: registerCheckControllerUpdateTool, category: 'controller', permission: 'write' },
    { fn: registerListAnomalyIncidentsTool, category: 'insights', permission: 'read' },
    { fn: registerGetAnomalyIncidentTool, category: 'insights', permission: 'read' },
    { fn: registerGetUnresolvedIncidentCountTool, category: 'insights', permission: 'read' },
    { fn: registerGetAnomalyStatisticsTool, category: 'insights', permission: 'read' },
    { fn: registerGetAnomalyIncidentDistributionTool, category: 'insights', permission: 'read' },
    { fn: registerGetAnomalyCategoryIncidentsTool, category: 'insights', permission: 'read' },
    { fn: registerListInfluencingDevicesTool, category: 'insights', permission: 'read' },
    { fn: registerListInfluencingClientsTool, category: 'insights', permission: 'read' },
    { fn: registerListDeviceIncidentsTool, category: 'insights', permission: 'read' },
    { fn: registerListStackIncidentsTool, category: 'insights', permission: 'read' },
    { fn: registerGetIncidentRankingTool, category: 'insights', permission: 'read' },
    { fn: registerGetIncidentObjectRankingTool, category: 'insights', permission: 'read' },
    { fn: registerListAnomalySettingsTool, category: 'insights', permission: 'read' },
    { fn: registerGetAnomalyNotificationSettingTool, category: 'insights', permission: 'read' },
    { fn: registerGetWifiHealthTimelineTool, category: 'insights', permission: 'read' },
    { fn: registerGetWifiSubHealthTimelineTool, category: 'insights', permission: 'read' },
    { fn: registerGetApHealthDetailTool, category: 'insights', permission: 'read' },
    { fn: registerGetApHealthTimelineTool, category: 'insights', permission: 'read' },
    { fn: registerListWifiHealthTopClientsTool, category: 'insights', permission: 'read' },
    { fn: registerListReportTabsTool, category: 'dashboard', permission: 'read' },
    { fn: registerGetReportTabTool, category: 'dashboard', permission: 'read' },
    { fn: registerSetIncidentStatusTool, category: 'insights', permission: 'write' },
    { fn: registerDeleteIncidentsTool, category: 'insights', permission: 'write' },
    { fn: registerSetAnomalyEventSettingTool, category: 'insights', permission: 'write' },
    { fn: registerSetAnomalyNotificationTool, category: 'insights', permission: 'write' },
    { fn: registerCreateReportTabTool, category: 'dashboard', permission: 'write' },
    { fn: registerUpdateReportTabTool, category: 'dashboard', permission: 'write' },
    { fn: registerDeleteReportTabsTool, category: 'dashboard', permission: 'write' },
    { fn: registerListApSsidOverrideAuditLogsTool, category: 'logs', permission: 'read' },
    { fn: registerListFailedUpgradeDevicesTool, category: 'logs', permission: 'read' },
    { fn: registerGetFailedUpgradeFirmwareTool, category: 'logs', permission: 'read' },
    { fn: registerSetGlobalLogNotificationsTool, category: 'logs', permission: 'write' },
    { fn: registerSetSiteLogNotificationsTool, category: 'logs', permission: 'write' },
    { fn: registerSetGlobalAuditNotificationsTool, category: 'logs', permission: 'write' },
    { fn: registerSetSiteAuditNotificationsTool, category: 'logs', permission: 'write' },
    { fn: registerResetGlobalLogNotificationsTool, category: 'logs', permission: 'write' },
    { fn: registerResetSiteLogNotificationsTool, category: 'logs', permission: 'write' },
    { fn: registerResolveSiteAlertsTool, category: 'logs', permission: 'write' },
    { fn: registerDeleteSiteEventLogsTool, category: 'logs', permission: 'write' },
    { fn: registerDeleteSiteAlertLogsTool, category: 'logs', permission: 'write' },
    { fn: registerDeleteGlobalEventLogsTool, category: 'logs', permission: 'write' },
    { fn: registerDeleteGlobalAlertLogsTool, category: 'logs', permission: 'write' },
    { fn: registerGetTopApsTool, category: 'dashboard', permission: 'read' },
    { fn: registerGetMostActiveAppsTool, category: 'dashboard', permission: 'read' },
    { fn: registerGetAllNetworkActivityTool, category: 'dashboard', permission: 'read' },
    { fn: registerGetClientAssociationActivitiesTool, category: 'dashboard', permission: 'read' },
    { fn: registerGetClientAssociationTimeDistributionTool, category: 'dashboard', permission: 'read' },
    { fn: registerGetClientAppTrafficTool, category: 'dashboard', permission: 'read' },
    { fn: registerGetAppClientTrafficTool, category: 'dashboard', permission: 'read' },
    { fn: registerGetCategoryClientTrafficTool, category: 'dashboard', permission: 'read' },
    { fn: registerGetCategoryAppTrafficTool, category: 'dashboard', permission: 'read' },
    { fn: registerListClientTrafficTool, category: 'dashboard', permission: 'read' },
    { fn: registerListAppCategoriesTool, category: 'dashboard', permission: 'read' },
    { fn: registerListBlockedAppsTool, category: 'dashboard', permission: 'read' },
    { fn: registerListAllowedAppsTool, category: 'dashboard', permission: 'read' },
    { fn: registerGetLongestClientUptimeTool, category: 'dashboard', permission: 'read' },
    { fn: registerGetCurrentClientCountTool, category: 'dashboard', permission: 'read' },
    { fn: registerGetClientsBubbleTool, category: 'dashboard', permission: 'read' },
    { fn: registerGetClientSsidDistributionTool, category: 'dashboard', permission: 'read' },
    { fn: registerGetClientSignalDistributionTool, category: 'dashboard', permission: 'read' },
    { fn: registerGetClientRssiDistributionTool, category: 'dashboard', permission: 'read' },
    { fn: registerGetClientFrequencyDistributionTool, category: 'dashboard', permission: 'read' },
    { fn: registerGetApDensityTool, category: 'dashboard', permission: 'read' },
    { fn: registerGetGatewayIspLoadTool, category: 'dashboard', permission: 'read' },
    { fn: registerGetNetworkOverviewCardTool, category: 'dashboard', permission: 'read' },
    { fn: registerListDashboardTabsTool, category: 'dashboard', permission: 'read' },
    { fn: registerListDashboardTabsWithoutOverallTool, category: 'dashboard', permission: 'read' },
    { fn: registerListMostActiveEapsByTrafficTool, category: 'dashboard', permission: 'read' },
    { fn: registerSearchClientTrafficTool, category: 'dashboard', permission: 'read' },
    { fn: registerCreateDashboardTabTool, category: 'dashboard', permission: 'write' },
    { fn: registerRenameDashboardTabTool, category: 'dashboard', permission: 'write' },
    { fn: registerResetDashboardTabTool, category: 'dashboard', permission: 'write' },
    { fn: registerDeleteDashboardTabTool, category: 'dashboard', permission: 'write' },
    { fn: registerSetDashboardTabCardsTool, category: 'dashboard', permission: 'write' },
    { fn: registerGetVoucherGroupDetailTool, category: 'hotspot-vouchers', permission: 'read' },
    { fn: registerGetVoucherTool, category: 'hotspot-vouchers', permission: 'read' },
    { fn: registerListVoucherGroupOptionsTool, category: 'hotspot-vouchers', permission: 'read' },
    { fn: registerGetVoucherGroupConfigLimitTool, category: 'hotspot-vouchers', permission: 'read' },
    { fn: registerListVoucherCurrenciesTool, category: 'hotspot-vouchers', permission: 'read' },
    { fn: registerGetVoucherGroupSummaryTool, category: 'hotspot-vouchers', permission: 'read' },
    { fn: registerListUnusedVoucherCodesTool, category: 'hotspot-vouchers', permission: 'read' },
    { fn: registerGetPortalCandidatesTool, category: 'hotspot-vouchers', permission: 'read' },
    { fn: registerGetVoucherHistoryStatisticsTool, category: 'hotspot-vouchers', permission: 'read' },
    { fn: registerGetVoucherDurationDistributionTool, category: 'hotspot-vouchers', permission: 'read' },
    { fn: registerGetVoucherPriceDistributionTool, category: 'hotspot-vouchers', permission: 'read' },
    { fn: registerListAuthSurveysTool, category: 'hotspot-portal', permission: 'read' },
    { fn: registerGetAuthSurveyTool, category: 'hotspot-portal', permission: 'read' },
    { fn: registerListSurveyResultsTool, category: 'hotspot-portal', permission: 'read' },
    { fn: registerGetSurveyResultTool, category: 'hotspot-portal', permission: 'read' },
    { fn: registerGetHotspotLocalUserTool, category: 'hotspot-portal', permission: 'read' },
    { fn: registerGetHotspotOperatorTool, category: 'hotspot-portal', permission: 'read' },
    { fn: registerListHotspotRateLimitProfilesTool, category: 'hotspot-portal', permission: 'read' },
    { fn: registerDeleteVouchersTool, category: 'hotspot-vouchers', permission: 'write' },
    { fn: registerDeleteVoucherGroupsTool, category: 'hotspot-vouchers', permission: 'write' },
    { fn: registerClearExpiredVouchersTool, category: 'hotspot-vouchers', permission: 'write' },
    { fn: registerSetVoucherGroupPatternTool, category: 'hotspot-vouchers', permission: 'write' },
    { fn: registerSetVoucherCurrencyTool, category: 'hotspot-vouchers', permission: 'write' },
    { fn: registerCreateAuthSurveyTool, category: 'hotspot-portal', permission: 'write' },
    { fn: registerUpdateAuthSurveyTool, category: 'hotspot-portal', permission: 'write' },
    { fn: registerDeleteAuthSurveyTool, category: 'hotspot-portal', permission: 'write' },
    { fn: registerDeleteSurveyResultsTool, category: 'hotspot-portal', permission: 'write' },
    { fn: registerDeleteAuthedRecordTool, category: 'hotspot-portal', permission: 'write' },
    { fn: registerDeleteExpiredAuthedRecordsTool, category: 'hotspot-portal', permission: 'write' },
    { fn: registerExtendAuthedRecordTool, category: 'hotspot-portal', permission: 'write' },
    { fn: registerDeleteHotspotLocalUsersTool, category: 'hotspot-portal', permission: 'write' },
    { fn: registerClearLocalUserDynamicMacTool, category: 'hotspot-portal', permission: 'write' },

    // --- Devices (general) ---
    { fn: registerListDevicesTool, category: 'devices-general', permission: 'read' },
    { fn: registerGetDeviceTool, category: 'devices-general', permission: 'read' },
    { fn: registerListPendingDevicesTool, category: 'devices-general', permission: 'read' },
    { fn: registerSearchDevicesTool, category: 'devices-general', permission: 'read' },
    { fn: registerListDevicesStatsTool, category: 'devices-general', permission: 'read' },
    { fn: registerGetAllDeviceBySiteTool, category: 'devices-general', permission: 'read' },
    { fn: registerGetFirmwareInfoTool, category: 'devices-general', permission: 'read' },
    { fn: registerGetGridAutoCheckUpgradeTool, category: 'devices-general', permission: 'read' },
    { fn: registerGetUplinkWiredDetailTool, category: 'devices-general', permission: 'read' },
    { fn: registerGetDownlinkWiredDevicesTool, category: 'devices-general', permission: 'read' },
    { fn: registerGetSpeedTestResultsTool, category: 'devices-general', permission: 'read' },
    { fn: registerGetFirmwareUpgradePlanTool, category: 'devices-general', permission: 'read' },
    { fn: registerGetUpgradeLogsTool, category: 'devices-general', permission: 'read' },
    { fn: registerGetDeviceTagListTool, category: 'devices-general', permission: 'read' },
    { fn: registerGetUpgradeOverviewCriticalTool, category: 'devices-general', permission: 'read' },
    { fn: registerGetUpgradeOverviewTryBetaTool, category: 'devices-general', permission: 'read' },
    { fn: registerListUpgradeFirmwaresTool, category: 'devices-general', permission: 'read' },
    { fn: registerListUpgradeOverviewFirmwaresTool, category: 'devices-general', permission: 'read' },
    { fn: registerListSitesStacksTool, category: 'devices-general', permission: 'read' },
    { fn: registerGetSitesDeviceWhiteListTool, category: 'devices-general', permission: 'read' },
    { fn: registerListSitesSettingIotDevicesTool, category: 'devices-general', permission: 'read' },

    // --- Devices (switch) ---
    { fn: registerGetSwitchStackDetailTool, category: 'devices-switch', permission: 'read' },
    { fn: registerGetSwitchDetailTool, category: 'devices-switch', permission: 'read' },
    { fn: registerListSwitchPortPoeInfoTool, category: 'devices-switch', permission: 'read' },
    { fn: registerListSwitchPortOverviewTool, category: 'devices-switch', permission: 'read' },
    { fn: registerListSwitchPortCountersTool, category: 'devices-switch', permission: 'read' },
    { fn: registerGetSwitchPortViewTool, category: 'devices-switch', permission: 'read' },
    { fn: registerListSwitchLldpNeighborsTool, category: 'devices-switch', permission: 'read' },
    { fn: registerListSwitchInterfacesTool, category: 'devices-switch', permission: 'read' },
    { fn: registerGetSwitchInterfacesBriefTool, category: 'devices-switch', permission: 'read' },
    { fn: registerListSwitchPortLagNetworksTool, category: 'devices-switch', permission: 'read' },
    { fn: registerListSwitchNetworksDetailTool, category: 'devices-switch', permission: 'read' },
    { fn: registerGetSwitchExistingNetworksTool, category: 'devices-switch', permission: 'read' },
    { fn: registerListSwitchDhcpUsersTool, category: 'devices-switch', permission: 'read' },
    { fn: registerGetSwitchDdmInfoTool, category: 'devices-switch', permission: 'read' },
    { fn: registerGetSwitchHealthDetailTool, category: 'devices-switch', permission: 'read' },
    { fn: registerGetSwitchHealthTimelineTool, category: 'devices-switch', permission: 'read' },
    { fn: registerListSwitchPortTagsTool, category: 'devices-switch', permission: 'read' },
    { fn: registerGetStackPortsTool, category: 'devices-switch', permission: 'read' },
    { fn: registerListSwitchNetworksTool, category: 'devices-switch', permission: 'read' },
    { fn: registerGetSwitchGeneralConfigTool, category: 'devices-switch', permission: 'read' },
    { fn: registerGetCableTestLogsTool, category: 'devices-switch', permission: 'read' },
    { fn: registerGetCableTestFullResultsTool, category: 'devices-switch', permission: 'read' },
    { fn: registerGetOswStackLagListTool, category: 'devices-switch', permission: 'read' },
    { fn: registerGetStackNetworkListTool, category: 'devices-switch', permission: 'read' },
    { fn: registerGetSwitchDot1xSettingTool, category: 'devices-switch', permission: 'read' },
    { fn: registerGetSitesSwitchesEsTool, category: 'devices-switch', permission: 'read' },
    { fn: registerGetSitesSwitchesEsGeneralConfigTool, category: 'devices-switch', permission: 'read' },
    { fn: registerListSitesCableTestSwitchesPortsTool, category: 'devices-switch', permission: 'read' },
    { fn: registerListSitesCableTestSwitchesIncrementResultsTool, category: 'devices-switch', permission: 'read' },

    // --- Devices (AP) ---
    { fn: registerGetApDetailTool, category: 'devices-ap', permission: 'read' },
    { fn: registerGetApRadiosTool, category: 'devices-ap', permission: 'read' },
    { fn: registerGetApUplinkConfigTool, category: 'devices-ap', permission: 'read' },
    { fn: registerGetRadiosConfigTool, category: 'devices-ap', permission: 'read' },
    { fn: registerGetApVlanConfigTool, category: 'devices-ap', permission: 'read' },
    { fn: registerGetMeshStatisticsTool, category: 'devices-ap', permission: 'read' },
    { fn: registerGetRFScanResultTool, category: 'devices-ap', permission: 'read' },
    { fn: registerGetApSnmpConfigTool, category: 'devices-ap', permission: 'read' },
    { fn: registerGetApLldpConfigTool, category: 'devices-ap', permission: 'read' },
    { fn: registerGetApGeneralConfigTool, category: 'devices-ap', permission: 'read' },
    { fn: registerGetApQosConfigTool, category: 'devices-ap', permission: 'read' },
    { fn: registerGetApIpv6ConfigTool, category: 'devices-ap', permission: 'read' },
    { fn: registerGetSitesApsIpSettingTool, category: 'devices-ap', permission: 'read' },
    { fn: registerGetSitesApsChannelLimitTool, category: 'devices-ap', permission: 'read' },
    { fn: registerGetSitesApsAvailableChannelTool, category: 'devices-ap', permission: 'read' },
    { fn: registerGetSitesApsLoadBalanceTool, category: 'devices-ap', permission: 'read' },
    { fn: registerGetSitesApsOfdmaTool, category: 'devices-ap', permission: 'read' },
    { fn: registerGetSitesApsPowerSavingTool, category: 'devices-ap', permission: 'read' },
    { fn: registerGetSitesApsTrunkSettingTool, category: 'devices-ap', permission: 'read' },
    { fn: registerGetSitesApsBridgeTool, category: 'devices-ap', permission: 'read' },
    { fn: registerListSitesApsPortsTool, category: 'devices-ap', permission: 'read' },
    { fn: registerGetApAfcStatusTool, category: 'devices-ap', permission: 'read' },
    { fn: registerGetApLanTrafficTool, category: 'devices-ap', permission: 'read' },
    { fn: registerGetApInterferenceDetectionStatusTool, category: 'devices-ap', permission: 'read' },
    { fn: registerGetApL3AccessTool, category: 'devices-ap', permission: 'read' },
    { fn: registerGetApLagConfigTool, category: 'devices-ap', permission: 'read' },
    { fn: registerGetApManagementWlanTool, category: 'devices-ap', permission: 'read' },
    { fn: registerListApPortVlansTool, category: 'devices-ap', permission: 'read' },
    { fn: registerGetApSsidOverridesTool, category: 'devices-ap', permission: 'read' },
    { fn: registerGetApRfScanResultTool, category: 'devices-ap', permission: 'read' },
    { fn: registerListLockToApApsTool, category: 'devices-ap', permission: 'read' },
    { fn: registerSetApChannelLimitTool, category: 'devices-ap', permission: 'write' },
    { fn: registerSetApConfigTool, category: 'devices-ap', permission: 'write' },
    { fn: registerSetApPowerSavingTool, category: 'devices-ap', permission: 'write' },
    { fn: registerStartApRfScanTool, category: 'devices-ap', permission: 'write' },
    { fn: registerSetApSsidOverridesTool, category: 'devices-ap', permission: 'write' },

    // --- Devices (gateway) ---
    { fn: registerGetGatewayDetailTool, category: 'devices-gateway', permission: 'read' },
    { fn: registerGetGatewayWanStatusTool, category: 'devices-gateway', permission: 'read' },
    { fn: registerGetGatewayLanStatusTool, category: 'devices-gateway', permission: 'read' },
    { fn: registerGetGatewayPortsTool, category: 'devices-gateway', permission: 'read' },
    { fn: registerGetSitesGatewaysGeneralConfigTool, category: 'devices-gateway', permission: 'read' },
    { fn: registerGetSitesGatewaysPinTool, category: 'devices-gateway', permission: 'read' },
    { fn: registerGetSitesGatewaysSimCardUsedTool, category: 'devices-gateway', permission: 'read' },
    { fn: registerGetSitesHealthGatewaysWansDetailsTool, category: 'devices-gateway', permission: 'read' },
    { fn: registerSetGatewayConfigTool, category: 'devices-gateway', permission: 'write' },
    { fn: registerRebootDeviceTool, category: 'devices-general', permission: 'write' },
    { fn: registerSetDeviceLedTool, category: 'devices-general', permission: 'write' },

    // --- Clients ---
    { fn: registerListClientsTool, category: 'clients', permission: 'read' },
    { fn: registerGetClientTool, category: 'clients', permission: 'read' },
    { fn: registerGetClientDetailTool, category: 'clients', permission: 'read' },
    { fn: registerGetGridKnownClientsTool, category: 'clients', permission: 'read' },
    { fn: registerGetGridClientHistoryTool, category: 'clients', permission: 'read' },
    { fn: registerGetClientConnectionHistoryTool, category: 'clients', permission: 'read' },
    { fn: registerGetClientTimelineTool, category: 'clients', permission: 'read' },
    { fn: registerGetClientHealthDetailTool, category: 'clients', permission: 'read' },
    { fn: registerGetClientHealthTimelineTool, category: 'clients', permission: 'read' },
    { fn: registerGetClientSearchFieldOptionsTool, category: 'clients', permission: 'read' },
    { fn: registerGetClientCorrectionOptionsTool, category: 'clients', permission: 'read' },
    { fn: registerGetClientLinkTopologyTool, category: 'clients', permission: 'read' },
    { fn: registerGetClientStatsTool, category: 'clients', permission: 'read' },
    { fn: registerGetClientIncidentCountsTool, category: 'clients', permission: 'read' },
    { fn: registerBlockClientTool, category: 'clients', permission: 'write' },
    { fn: registerUnblockClientTool, category: 'clients', permission: 'write' },
    { fn: registerReconnectClientTool, category: 'clients', permission: 'write' },
    { fn: registerSetClientRateLimitTool, category: 'clients', permission: 'write' },
    { fn: registerSetClientRateLimitProfileTool, category: 'clients', permission: 'write' },
    { fn: registerDisableClientRateLimitTool, category: 'clients', permission: 'write' },

    // --- Client insights ---
    { fn: registerListMostActiveClientsTool, category: 'client-insights', permission: 'read' },
    { fn: registerListClientsActivityTool, category: 'client-insights', permission: 'read' },
    { fn: registerListClientsPastConnectionsTool, category: 'client-insights', permission: 'read' },
    { fn: registerGetClientsDistributionTool, category: 'client-insights', permission: 'read' },
    { fn: registerGetPastClientNumTool, category: 'client-insights', permission: 'read' },

    // --- Security threat ---
    { fn: registerGetThreatListTool, category: 'security-threat', permission: 'read' },
    { fn: registerGetTopThreatsTool, category: 'security-threat', permission: 'read' },
    { fn: registerListSiteThreatManagementTool, category: 'security-threat', permission: 'read' },
    { fn: registerGetThreatDetailTool, category: 'security-threat', permission: 'read' },
    { fn: registerGetThreatCountTool, category: 'security-threat', permission: 'read' },
    { fn: registerGetWirelessIdsConfigTool, category: 'security-wids', permission: 'read' },
    { fn: registerGetWirelessIpsConfigTool, category: 'security-wids', permission: 'read' },
    { fn: registerSetWirelessIdsConfigTool, category: 'security-wids', permission: 'write' },
    { fn: registerSetWirelessIpsConfigTool, category: 'security-wids', permission: 'write' },
    { fn: registerCreateIpsAllowEntryTool, category: 'firewall-ids', permission: 'write' },
    { fn: registerUpdateIpsAllowEntryTool, category: 'firewall-ids', permission: 'write' },
    { fn: registerDeleteIpsAllowEntryTool, category: 'firewall-ids', permission: 'write' },
    { fn: registerDeleteIpsBlockEntryTool, category: 'firewall-ids', permission: 'write' },
    { fn: registerUpdateIpsSignatureTool, category: 'firewall-ids', permission: 'write' },
    { fn: registerDeleteIpsSignatureTool, category: 'firewall-ids', permission: 'write' },
    { fn: registerGetThreatMapTool, category: 'security-threat', permission: 'read' },
    { fn: registerGetThreatCategoryCountsTool, category: 'security-threat', permission: 'read' },
    { fn: registerListCountryThreatsTool, category: 'security-threat', permission: 'read' },
    { fn: registerListBlockedCountriesTool, category: 'security-threat', permission: 'read' },
    { fn: registerBlockCountryTool, category: 'security-threat', permission: 'write' },
    { fn: registerUnblockCountryTool, category: 'security-threat', permission: 'write' },

    // --- Security WIDS ---
    { fn: registerGetWidsTool, category: 'security-wids', permission: 'read' },
    { fn: registerGetWidsBlacklistTool, category: 'security-wids', permission: 'read' },
    { fn: registerGetRogueApsTool, category: 'security-wids', permission: 'read' },

    // --- Network WAN ---
    { fn: registerGetInternetInfoTool, category: 'network-wan', permission: 'read' },
    { fn: registerGetWanLanStatusTool, category: 'network-wan', permission: 'read' },
    { fn: registerGetWanPortsConfigTool, category: 'network-wan', permission: 'read' },
    { fn: registerGetInternetBasicPortInfoTool, category: 'network-wan', permission: 'read' },
    { fn: registerGetInternetTool, category: 'network-wan', permission: 'read' },
    { fn: registerGetGridVirtualWanTool, category: 'network-wan', permission: 'read' },
    { fn: registerGetInternetLoadBalanceTool, category: 'network-wan', permission: 'read' },
    { fn: registerGetIspBandScanTool, category: 'network-wan', permission: 'read' },
    { fn: registerGetDisableNatListTool, category: 'network-wan', permission: 'read' },
    { fn: registerGetLtePortConfigTool, category: 'network-wan', permission: 'read' },
    { fn: registerGetWanPortDetailTool, category: 'network-wan', permission: 'read' },
    { fn: registerGetWanIspProfileTool, category: 'network-wan', permission: 'read' },
    { fn: registerGetWanQosConfigTool, category: 'network-wan', permission: 'read' },
    { fn: registerGetWanHealthDetailTool, category: 'network-wan', permission: 'read' },
    { fn: registerGetWanUsageStatsTool, category: 'network-wan', permission: 'read' },
    { fn: registerGetWanNatConfigTool, category: 'network-wan', permission: 'read' },

    // --- Network LAN ---
    { fn: registerGetLanNetworkListTool, category: 'network-lan', permission: 'read' },
    { fn: registerGetLanNetworkListV2Tool, category: 'network-lan', permission: 'read' },
    { fn: registerGetLanProfileListTool, category: 'network-lan', permission: 'read' },
    { fn: registerGetInterfaceLanNetworkTool, category: 'network-lan', permission: 'read' },
    { fn: registerGetInterfaceLanNetworkV2Tool, category: 'network-lan', permission: 'read' },
    { fn: registerGetDhcpReservationGridTool, category: 'network-lan', permission: 'read' },
    { fn: registerGetIpMacBindingGeneralSettingTool, category: 'network-lan', permission: 'read' },
    { fn: registerGetGridIpMacBindingTool, category: 'network-lan', permission: 'read' },
    { fn: registerGetDnsCacheSettingTool, category: 'network-lan', permission: 'read' },
    { fn: registerGetDnsProxyTool, category: 'network-lan', permission: 'read' },
    { fn: registerGetIgmpTool, category: 'network-lan', permission: 'read' },
    { fn: registerGetSwitchVlanInterfaceTool, category: 'network-lan', permission: 'read' },
    { fn: registerGetLanDnsRulesTool, category: 'network-lan', permission: 'read' },
    { fn: registerGetLanProfileEsUsageTool, category: 'network-lan', permission: 'read' },
    { fn: registerGetLanClientCountTool, category: 'network-lan', permission: 'read' },

    // --- Network NAT ---
    { fn: registerGetPortForwardingStatusTool, category: 'network-nat', permission: 'read' },
    { fn: registerGetPortForwardingListTool, category: 'network-nat', permission: 'read' },
    { fn: registerListPortForwardingRulesTool, category: 'network-nat', permission: 'read' },
    { fn: registerGetGridOtoNatsTool, category: 'network-nat', permission: 'read' },

    // --- Network routing ---
    { fn: registerListStaticRoutesTool, category: 'network-routing', permission: 'read' },
    { fn: registerGetStaticRoutingInterfaceListTool, category: 'network-routing', permission: 'read' },
    { fn: registerGetGridStaticRoutingTool, category: 'network-routing', permission: 'read' },
    { fn: registerListPolicyRoutesTool, category: 'network-routing', permission: 'read' },
    { fn: registerGetGridPolicyRoutingTool, category: 'network-routing', permission: 'read' },
    { fn: registerGetRoutingTableTool, category: 'network-routing', permission: 'read' },
    { fn: registerGetOspfProcessTool, category: 'network-routing', permission: 'read' },
    { fn: registerGetOspfInterfaceTool, category: 'network-routing', permission: 'read' },
    { fn: registerGetVrrpConfigTool, category: 'network-routing', permission: 'read' },
    { fn: registerGetOspfNeighborsTool, category: 'network-routing', permission: 'read' },

    // --- Network services ---
    { fn: registerGetAlgTool, category: 'network-services', permission: 'read' },
    { fn: registerGetUpnpSettingTool, category: 'network-services', permission: 'read' },
    { fn: registerGetDdnsGridTool, category: 'network-services', permission: 'read' },
    { fn: registerGetBandwidthControlTool, category: 'network-services', permission: 'read' },
    { fn: registerGetBandwidthCtrlTool, category: 'network-services', permission: 'read' },
    { fn: registerGetGridBandwidthCtrlRuleTool, category: 'network-services', permission: 'read' },
    { fn: registerGetSessionLimitTool, category: 'network-services', permission: 'read' },
    { fn: registerGetGridSessionLimitRuleTool, category: 'network-services', permission: 'read' },
    { fn: registerGetSnmpSettingTool, category: 'network-services', permission: 'read' },
    { fn: registerGetLldpSettingTool, category: 'network-services', permission: 'read' },
    { fn: registerGetRemoteLoggingSettingTool, category: 'network-services', permission: 'read' },
    { fn: registerGetAccessControlTool, category: 'network-services', permission: 'read' },
    { fn: registerGetSshSettingTool, category: 'network-services', permission: 'read' },
    { fn: registerGetDnsCacheDataListTool, category: 'network-services', permission: 'read' },
    { fn: registerGetIptvSettingTool, category: 'network-services', permission: 'read' },
    { fn: registerGetNtpSettingTool, category: 'network-services', permission: 'read' },
    { fn: registerGetSyslogConfigTool, category: 'network-services', permission: 'read' },
    { fn: registerCreateDhcpReservationTool, category: 'network-services', permission: 'write' },
    { fn: registerUpdateDhcpReservationTool, category: 'network-services', permission: 'write' },
    { fn: registerDeleteDhcpReservationTool, category: 'network-services', permission: 'write' },

    // --- Wireless SSID ---
    { fn: registerGetMulticastRateLimitTool, category: 'wireless-ssid', permission: 'read' },
    { fn: registerGetApLoadBalanceTool, category: 'wireless-ssid', permission: 'read' },
    { fn: registerGetApOfdmaConfigTool, category: 'wireless-ssid', permission: 'read' },
    { fn: registerGetWlanGroupListTool, category: 'wireless-ssid', permission: 'read' },
    { fn: registerGetSsidListTool, category: 'wireless-ssid', permission: 'read' },
    { fn: registerGetSsidDetailTool, category: 'wireless-ssid', permission: 'read' },
    { fn: registerListAllSsidsTool, category: 'wireless-ssid', permission: 'read' },
    { fn: registerGetSsidConfigTool, category: 'wireless-ssid', permission: 'read' },
    { fn: registerListDuplicateSsidNamesTool, category: 'wireless-ssid', permission: 'read' },
    { fn: registerListSsidApGroupsTool, category: 'wireless-ssid', permission: 'read' },
    { fn: registerListApGroupsTool, category: 'wireless-ssid', permission: 'read' },
    { fn: registerGetApGroupTool, category: 'wireless-ssid', permission: 'read' },
    { fn: registerListApGroupApsTool, category: 'wireless-ssid', permission: 'read' },
    { fn: registerGetApGroupCountTool, category: 'wireless-ssid', permission: 'read' },
    { fn: registerCreateApGroupTool, category: 'wireless-ssid', permission: 'write' },
    { fn: registerUpdateApGroupTool, category: 'wireless-ssid', permission: 'write' },
    { fn: registerDeleteApGroupTool, category: 'wireless-ssid', permission: 'write' },
    { fn: registerSetSsidApGroupsTool, category: 'wireless-ssid', permission: 'write' },
    { fn: registerSetSsidConfigTool, category: 'wireless-ssid', permission: 'write' },
    { fn: registerGetSsidsBySiteTool, category: 'wireless-ssid', permission: 'read' },

    // --- Wireless radio ---
    { fn: registerGetRadioFrequencyPlanningConfigTool, category: 'wireless-radio', permission: 'read' },
    { fn: registerGetRadioFrequencyPlanningResultTool, category: 'wireless-radio', permission: 'read' },
    { fn: registerGetBandSteeringSettingTool, category: 'wireless-radio', permission: 'read' },
    { fn: registerGetBeaconControlSettingTool, category: 'wireless-radio', permission: 'read' },
    { fn: registerGetChannelLimitSettingTool, category: 'wireless-radio', permission: 'read' },
    { fn: registerGetMeshSettingTool, category: 'wireless-radio', permission: 'read' },
    { fn: registerGetRoamingSettingTool, category: 'wireless-radio', permission: 'read' },
    { fn: registerGetChannelsTool, category: 'wireless-radio', permission: 'read' },
    { fn: registerGetInterferenceTool, category: 'wireless-radio', permission: 'read' },
    { fn: registerGetRetryAndDroppedRateTool, category: 'wireless-radio', permission: 'read' },

    // --- Wireless auth ---
    { fn: registerGetOuiProfileListTool, category: 'wireless-auth', permission: 'read' },
    { fn: registerGetMacAuthSettingTool, category: 'wireless-auth', permission: 'read' },
    { fn: registerGetMacAuthSsidsTool, category: 'wireless-auth', permission: 'read' },
    { fn: registerGetMacFilteringGeneralSettingTool, category: 'wireless-auth', permission: 'read' },
    { fn: registerGetGridAllowMacFilteringTool, category: 'wireless-auth', permission: 'read' },
    { fn: registerGetGridDenyMacFilteringTool, category: 'wireless-auth', permission: 'read' },
    { fn: registerGetEapDot1xSettingTool, category: 'wireless-auth', permission: 'read' },

    // --- Firewall ACL ---
    { fn: registerGetAclConfigTypeSettingTool, category: 'firewall-acl', permission: 'read' },
    { fn: registerGetOsgCustomAclListTool, category: 'firewall-acl', permission: 'read' },
    { fn: registerGetOswAclListTool, category: 'firewall-acl', permission: 'read' },
    { fn: registerGetGridAllowListTool, category: 'firewall-acl', permission: 'read' },
    { fn: registerGetGridBlockListTool, category: 'firewall-acl', permission: 'read' },
    { fn: registerGetGridGatewayRuleTool, category: 'firewall-acl', permission: 'read' },
    { fn: registerGetGridEapRuleTool, category: 'firewall-acl', permission: 'read' },
    { fn: registerGetFirewallSettingTool, category: 'firewall-acl', permission: 'read' },
    { fn: registerListOsgAclsTool, category: 'firewall-acl', permission: 'read' },
    { fn: registerListEapAclsTool, category: 'firewall-acl', permission: 'read' },
    { fn: registerGetDot1xConfigTool, category: 'firewall-acl', permission: 'read' },
    { fn: registerGetRadiusProxyConfigTool, category: 'firewall-acl', permission: 'read' },
    { fn: registerGetApplicationAclTool, category: 'firewall-acl', permission: 'read' },
    { fn: registerSetAclConfigTypeSettingTool, category: 'firewall-acl', permission: 'write' },
    { fn: registerCreateGatewayAclTool, category: 'firewall-acl', permission: 'write' },
    { fn: registerCreateEapAclTool, category: 'firewall-acl', permission: 'write' },
    { fn: registerCreateSwitchAclTool, category: 'firewall-acl', permission: 'write' },
    { fn: registerUpdateGatewayAclTool, category: 'firewall-acl', permission: 'write' },
    { fn: registerUpdateEapAclTool, category: 'firewall-acl', permission: 'write' },
    { fn: registerUpdateSwitchAclTool, category: 'firewall-acl', permission: 'write' },
    { fn: registerDeleteAclTool, category: 'firewall-acl', permission: 'write' },
    { fn: registerSetFirewallSettingTool, category: 'firewall-acl', permission: 'write' },

    // --- Firewall traffic ---
    { fn: registerGetUrlFilterGeneralTool, category: 'firewall-traffic', permission: 'read' },
    { fn: registerGetApplicationControlStatusTool, category: 'firewall-traffic', permission: 'read' },
    { fn: registerGetAttackDefenseSettingTool, category: 'firewall-traffic', permission: 'read' },
    { fn: registerGetGatewayQosClassRulesTool, category: 'firewall-traffic', permission: 'read' },
    { fn: registerGetBandwidthCtrlDetailTool, category: 'firewall-traffic', permission: 'read' },
    { fn: registerGetAppControlRulesTool, category: 'firewall-traffic', permission: 'read' },
    { fn: registerGetAppControlCategoriesTool, category: 'firewall-traffic', permission: 'read' },
    { fn: registerGetUrlFilterRulesTool, category: 'firewall-traffic', permission: 'read' },
    { fn: registerGetUrlFilterBlacklistTool, category: 'firewall-traffic', permission: 'read' },
    { fn: registerGetUrlFilterWhitelistTool, category: 'firewall-traffic', permission: 'read' },
    { fn: registerGetMacFilterDetailTool, category: 'firewall-traffic', permission: 'read' },
    { fn: registerGetQosPolicyTool, category: 'firewall-traffic', permission: 'read' },
    { fn: registerGetTrafficPriorityTool, category: 'firewall-traffic', permission: 'read' },
    { fn: registerGetTrafficStatsTool, category: 'firewall-traffic', permission: 'read' },
    { fn: registerGetQosPolicyRuleTool, category: 'firewall-traffic', permission: 'read' },
    { fn: registerGetQosMarkingRuleTool, category: 'firewall-traffic', permission: 'read' },
    { fn: registerGetDscpConfigTool, category: 'firewall-traffic', permission: 'read' },
    { fn: registerSetAppControlRuleTool, category: 'firewall-traffic', permission: 'write' },
    { fn: registerDeleteAppControlRuleTool, category: 'firewall-traffic', permission: 'write' },
    { fn: registerSetBandwidthControlRuleTool, category: 'firewall-traffic', permission: 'write' },
    { fn: registerDeleteBandwidthControlRuleTool, category: 'firewall-traffic', permission: 'write' },
    { fn: registerSetAccessControlTool, category: 'firewall-traffic', permission: 'write' },

    // --- Firewall IDS ---
    { fn: registerGetIpsConfigTool, category: 'firewall-ids', permission: 'read' },
    { fn: registerGetGridSignatureTool, category: 'firewall-ids', permission: 'read' },
    { fn: registerGetGlobalSecuritySettingTool, category: 'firewall-ids', permission: 'read' },

    // --- VPN ---
    { fn: registerGetVpnSettingsTool, category: 'vpn', permission: 'read' },
    { fn: registerListSiteToSiteVpnsTool, category: 'vpn', permission: 'read' },
    { fn: registerGetSiteToSiteVpnInfoTool, category: 'vpn', permission: 'read' },
    { fn: registerListWireguardTool, category: 'vpn', permission: 'read' },
    { fn: registerListWireguardPeersTool, category: 'vpn', permission: 'read' },
    { fn: registerGetWireguardSummaryTool, category: 'vpn', permission: 'read' },
    { fn: registerListClientToSiteVpnServersTool, category: 'vpn', permission: 'read' },
    { fn: registerListClientToSiteVpnClientsTool, category: 'vpn', permission: 'read' },
    { fn: registerGetClientToSiteVpnServerInfoTool, category: 'vpn', permission: 'read' },
    { fn: registerGetSslVpnServerSettingTool, category: 'vpn', permission: 'read' },
    { fn: registerGetGridIpsecFailoverTool, category: 'vpn', permission: 'read' },
    { fn: registerGetVpnTunnelStatsTool, category: 'vpn', permission: 'read' },
    { fn: registerGetIpsecVpnStatsTool, category: 'vpn', permission: 'read' },
    { fn: registerListVpnUsersTool, category: 'vpn', permission: 'read' },
    { fn: registerListSslVpnResourcesTool, category: 'vpn', permission: 'read' },
    { fn: registerListSslVpnResourceGroupsTool, category: 'vpn', permission: 'read' },
    { fn: registerListSslVpnUserGroupsTool, category: 'vpn', permission: 'read' },
    { fn: registerListSslVpnUserGroupUsersTool, category: 'vpn', permission: 'read' },
    { fn: registerListSslVpnLocksTool, category: 'vpn', permission: 'read' },
    { fn: registerGetEoGreTunnelConfigTool, category: 'vpn', permission: 'read' },
    { fn: registerListVpnServerStatusTool, category: 'vpn', permission: 'read' },
    { fn: registerListVpnServerClientStatusTool, category: 'vpn', permission: 'read' },
    { fn: registerListVpnClientStatusTool, category: 'vpn', permission: 'read' },
    { fn: registerListSiteToSiteVpnStatusTool, category: 'vpn', permission: 'read' },
    { fn: registerListSiteToSiteVpnPeerStatusTool, category: 'vpn', permission: 'read' },
    { fn: registerGetGridDashboardTunnelStatsTool, category: 'vpn', permission: 'read' },
    { fn: registerGetGridDashboardIpsecTunnelStatsTool, category: 'vpn', permission: 'read' },
    { fn: registerGetGridDashboardOpenVpnTunnelStatsTool, category: 'vpn', permission: 'read' },
    { fn: registerGetIpsecTunnelListTool, category: 'vpn', permission: 'read' },
    { fn: registerGetIpsecTunnelDetailTool, category: 'vpn', permission: 'read' },
    { fn: registerGetAdvancedVpnSettingTool, category: 'vpn', permission: 'read' },
    { fn: registerGetVpnUserListTool, category: 'vpn', permission: 'read' },
    { fn: registerGetVpnUserDetailTool, category: 'vpn', permission: 'read' },
    { fn: registerGetVpnClientStatusTool, category: 'vpn', permission: 'read' },
    { fn: registerGetVpnRouteConfigTool, category: 'vpn', permission: 'read' },

    // --- Profiles ---
    { fn: registerListServiceTypeTool, category: 'profiles', permission: 'read' },
    { fn: registerGetServiceTypeSummaryTool, category: 'profiles', permission: 'read' },
    { fn: registerGetGroupProfilesByTypeTool, category: 'profiles', permission: 'read' },
    { fn: registerGetPPSKProfilesTool, category: 'profiles', permission: 'read' },
    { fn: registerListMdnsProfileTool, category: 'profiles', permission: 'read' },
    { fn: registerListGroupProfilesTool, category: 'profiles', permission: 'read' },
    { fn: registerListTimeRangeProfilesTool, category: 'profiles', permission: 'read' },
    { fn: registerCreateTimeRangeProfileTool, category: 'profiles', permission: 'write' },
    { fn: registerUpdateTimeRangeProfileTool, category: 'profiles', permission: 'write' },
    { fn: registerDeleteTimeRangeProfileTool, category: 'profiles', permission: 'write' },
    { fn: registerGetRateLimitProfilesTool, category: 'profiles', permission: 'read' },
    { fn: registerCreatePoeScheduleTool, category: 'schedules', permission: 'write' },
    { fn: registerUpdatePoeScheduleTool, category: 'schedules', permission: 'write' },
    { fn: registerDeletePoeScheduleTool, category: 'schedules', permission: 'write' },
    { fn: registerCreateIpMacBindingTool, category: 'network-lan', permission: 'write' },
    { fn: registerUpdateIpMacBindingTool, category: 'network-lan', permission: 'write' },
    { fn: registerDeleteIpMacBindingTool, category: 'network-lan', permission: 'write' },
    { fn: registerCreateIotServerTool, category: 'profiles', permission: 'write' },
    { fn: registerUpdateIotServerTool, category: 'profiles', permission: 'write' },
    { fn: registerDeleteIotServerTool, category: 'profiles', permission: 'write' },
    { fn: registerSetIotRadioSettingTool, category: 'profiles', permission: 'write' },
    { fn: registerListIotServersTool, category: 'profiles', permission: 'read' },
    { fn: registerGetIotRadioSettingTool, category: 'profiles', permission: 'read' },
    { fn: registerGetIntelliRecoverSettingTool, category: 'profiles', permission: 'read' },
    { fn: registerGetSpeedTestSettingTool, category: 'profiles', permission: 'read' },
    { fn: registerGetMldSettingTool, category: 'profiles', permission: 'read' },
    { fn: registerGetPortalLogoutSettingTool, category: 'profiles', permission: 'read' },
    { fn: registerListPortalsWithLogoutTool, category: 'profiles', permission: 'read' },
    { fn: registerGetSiteMailServerTool, category: 'profiles', permission: 'read' },
    { fn: registerSetSiteLedTool, category: 'profiles', permission: 'write' },
    { fn: registerSetMulticastRateLimitTool, category: 'profiles', permission: 'write' },
    { fn: registerSetSiteRememberSettingTool, category: 'profiles', permission: 'write' },
    { fn: registerSetSpeedTestSettingTool, category: 'profiles', permission: 'write' },
    { fn: registerSetPortalLogoutSettingTool, category: 'profiles', permission: 'write' },
    { fn: registerSetIntelliRecoverSettingTool, category: 'profiles', permission: 'write' },
    { fn: registerSetSiteMailServerTool, category: 'profiles', permission: 'write' },
    { fn: registerCreateRateLimitProfileTool, category: 'profiles', permission: 'write' },
    { fn: registerUpdateRateLimitProfileTool, category: 'profiles', permission: 'write' },
    { fn: registerDeleteRateLimitProfileTool, category: 'profiles', permission: 'write' },
    { fn: registerCreateServiceTypeTool, category: 'profiles', permission: 'write' },
    { fn: registerUpdateServiceTypeTool, category: 'profiles', permission: 'write' },
    { fn: registerDeleteServiceTypeTool, category: 'profiles', permission: 'write' },
    { fn: registerCreateMdnsProfileTool, category: 'profiles', permission: 'write' },
    { fn: registerUpdateMdnsProfileTool, category: 'profiles', permission: 'write' },
    { fn: registerDeleteMdnsProfileTool, category: 'profiles', permission: 'write' },
    { fn: registerCreateApnProfileTool, category: 'profiles', permission: 'write' },
    { fn: registerUpdateApnProfileTool, category: 'profiles', permission: 'write' },
    { fn: registerDeleteApnProfileTool, category: 'profiles', permission: 'write' },
    { fn: registerCreateWifiCallingProfileTool, category: 'profiles', permission: 'write' },
    { fn: registerCopyWifiCallingProfileTool, category: 'profiles', permission: 'write' },
    { fn: registerUpdateWifiCallingProfileTool, category: 'profiles', permission: 'write' },
    { fn: registerDeleteWifiCallingProfileTool, category: 'profiles', permission: 'write' },
    { fn: registerCreateOuiProfileTool, category: 'wireless-auth', permission: 'write' },
    { fn: registerUpdateOuiProfileTool, category: 'wireless-auth', permission: 'write' },
    { fn: registerDeleteOuiProfileTool, category: 'wireless-auth', permission: 'write' },
    { fn: registerListOuiProfileSummariesTool, category: 'wireless-auth', permission: 'read' },
    { fn: registerListApnProfilesTool, category: 'profiles', permission: 'read' },
    { fn: registerListWifiCallingProfilesTool, category: 'profiles', permission: 'read' },
    { fn: registerListSwitchOuiRulesTool, category: 'profiles', permission: 'read' },
    { fn: registerListSwitchOuiValidVlansTool, category: 'profiles', permission: 'read' },
    { fn: registerListSwitchOuiRuleSwitchesTool, category: 'profiles', permission: 'read' },
    { fn: registerListSwitchOuiSupportedSwitchesTool, category: 'profiles', permission: 'read' },
    { fn: registerListSwitchOuiAutoAddVlanSwitchesTool, category: 'profiles', permission: 'read' },
    { fn: registerGetSwitchOuiAutoAddVlanTool, category: 'profiles', permission: 'read' },
    { fn: registerGetSwitchOuiAutoAddVlanAllSupportTool, category: 'profiles', permission: 'read' },
    { fn: registerGetGoogleLdapProfileTool, category: 'profiles', permission: 'read' },
    { fn: registerGetBuiltinRadiusUsersTool, category: 'profiles', permission: 'read' },
    { fn: registerGetRadiusUserDetailTool, category: 'profiles', permission: 'read' },
    { fn: registerGetPpskNetworkProfileTool, category: 'profiles', permission: 'read' },
    { fn: registerGetPpskUserGroupTool, category: 'profiles', permission: 'read' },
    { fn: registerGetPpskUserListTool, category: 'profiles', permission: 'read' },
    { fn: registerGetServiceProfileTool, category: 'profiles', permission: 'read' },
    { fn: registerGetQosProfileTool, category: 'profiles', permission: 'read' },
    { fn: registerGetScheduleProfileTool, category: 'profiles', permission: 'read' },
    { fn: registerGetGroupPolicyDetailTool, category: 'profiles', permission: 'read' },
    { fn: registerGetIpGroupProfileTool, category: 'profiles', permission: 'read' },
    { fn: registerGetUrlGroupProfileTool, category: 'profiles', permission: 'read' },
    { fn: registerGetAppGroupProfileTool, category: 'profiles', permission: 'read' },
    { fn: registerGetVlanProfileTool, category: 'profiles', permission: 'read' },
    { fn: registerGetUserRoleProfileTool, category: 'profiles', permission: 'read' },
    { fn: registerGetPortalProfileTool, category: 'profiles', permission: 'read' },

    // --- Auth profiles ---
    { fn: registerGetLdapProfileListTool, category: 'auth-profiles', permission: 'read' },
    { fn: registerGetRadiusUserListTool, category: 'auth-profiles', permission: 'read' },
    { fn: registerGetRadiusServerTool, category: 'auth-profiles', permission: 'read' },
    { fn: registerListRadiusProfilesTool, category: 'auth-profiles', permission: 'read' },
    { fn: registerCreateRadiusProfileTool, category: 'auth-profiles', permission: 'write' },
    { fn: registerUpdateRadiusProfileTool, category: 'auth-profiles', permission: 'write' },
    { fn: registerDeleteRadiusProfileTool, category: 'auth-profiles', permission: 'write' },
    { fn: registerCreateLdapProfileTool, category: 'auth-profiles', permission: 'write' },
    { fn: registerUpdateLdapProfileTool, category: 'auth-profiles', permission: 'write' },
    { fn: registerDeleteLdapProfileTool, category: 'auth-profiles', permission: 'write' },
    { fn: registerCreateRadiusUserTool, category: 'auth-profiles', permission: 'write' },
    { fn: registerUpdateRadiusUserTool, category: 'auth-profiles', permission: 'write' },
    { fn: registerDeleteRadiusUserTool, category: 'auth-profiles', permission: 'write' },
    { fn: registerSetRadiusServerTool, category: 'auth-profiles', permission: 'write' },

    // --- Logs ---
    { fn: registerListSiteEventsTool, category: 'logs', permission: 'read' },
    { fn: registerListSiteAlertsTool, category: 'logs', permission: 'read' },
    { fn: registerListSiteAuditLogsTool, category: 'logs', permission: 'read' },
    { fn: registerListGlobalEventsTool, category: 'logs', permission: 'read' },
    { fn: registerListGlobalAlertsTool, category: 'logs', permission: 'read' },
    { fn: registerGetLogSettingForSiteTool, category: 'logs', permission: 'read' },
    { fn: registerGetLogSettingForSiteV2Tool, category: 'logs', permission: 'read' },
    { fn: registerGetAuditLogSettingForSiteTool, category: 'logs', permission: 'read' },
    { fn: registerGetLogSettingForGlobalTool, category: 'logs', permission: 'read' },
    { fn: registerGetLogSettingForGlobalV2Tool, category: 'logs', permission: 'read' },
    { fn: registerGetAuditLogSettingForGlobalTool, category: 'logs', permission: 'read' },
    { fn: registerGetAuditLogsForGlobalTool, category: 'logs', permission: 'read' },

    // --- Controller ---
    { fn: registerGetDataRetentionTool, category: 'controller', permission: 'read' },
    { fn: registerGetControllerPortTool, category: 'controller', permission: 'read' },
    { fn: registerGetPortalPortTool, category: 'controller', permission: 'read' },
    { fn: registerGetCertificateTool, category: 'controller', permission: 'read' },
    { fn: registerGetExperienceImprovementTool, category: 'controller', permission: 'read' },
    { fn: registerGetGlobalDashboardOverviewTool, category: 'controller', permission: 'read' },
    { fn: registerGetClientHistoryDataEnableTool, category: 'controller', permission: 'read' },
    { fn: registerGetControllerStatusTool, category: 'controller', permission: 'read' },
    { fn: registerGetGeneralSettingsTool, category: 'controller', permission: 'read' },
    { fn: registerGetRetentionTool, category: 'controller', permission: 'read' },
    { fn: registerGetClientActiveTimeoutTool, category: 'controller', permission: 'read' },
    { fn: registerGetRemoteLoggingTool, category: 'controller', permission: 'read' },
    { fn: registerGetLoggingTool, category: 'controller', permission: 'read' },
    { fn: registerGetUiInterfaceTool, category: 'controller', permission: 'read' },
    { fn: registerGetDeviceAccessManagementTool, category: 'controller', permission: 'read' },
    { fn: registerGetWebhookForGlobalTool, category: 'controller', permission: 'read' },
    { fn: registerGetWebhookLogsForGlobalTool, category: 'controller', permission: 'read' },
    { fn: registerGetMailServerStatusTool, category: 'controller', permission: 'read' },

    // --- Maintenance ---
    { fn: registerGetBackupFileListTool, category: 'maintenance', permission: 'read' },
    { fn: registerGetBackupResultTool, category: 'maintenance', permission: 'read' },
    { fn: registerGetRestoreResultTool, category: 'maintenance', permission: 'read' },
    { fn: registerGetSiteBackupResultTool, category: 'maintenance', permission: 'read' },
    { fn: registerGetSiteBackupFileListTool, category: 'maintenance', permission: 'read' },
    { fn: registerGetRogueApExportTool, category: 'maintenance', permission: 'read' },
    { fn: registerGetBackupScheduleTool, category: 'maintenance', permission: 'read' },
    { fn: registerBackupControllerTool, category: 'maintenance', permission: 'write' },
    { fn: registerBackupControllerToFileServerTool, category: 'maintenance', permission: 'write' },
    { fn: registerBackupSitesTool, category: 'maintenance', permission: 'write' },
    { fn: registerBackupSitesToFileServerTool, category: 'maintenance', permission: 'write' },
    { fn: registerSetBackupScheduleTool, category: 'maintenance', permission: 'write' },
    { fn: registerRestoreControllerTool, category: 'recovery', permission: 'write' },
    { fn: registerRestoreControllerFromFileServerTool, category: 'recovery', permission: 'write' },
    { fn: registerRestoreSitesTool, category: 'recovery', permission: 'write' },
    { fn: registerRestoreSitesFromFileServerTool, category: 'recovery', permission: 'write' },

    // --- Account users ---
    { fn: registerGetAllCloudUsersTool, category: 'account-users', permission: 'read' },
    { fn: registerGetAllLocalUsersTool, category: 'account-users', permission: 'read' },
    { fn: registerGetAllRolesTool, category: 'account-users', permission: 'read' },
    { fn: registerGetRoleDetailTool, category: 'account-users', permission: 'read' },
    { fn: registerGetAvailableRolesTool, category: 'account-users', permission: 'read' },
    { fn: registerGetAllUsersAppTool, category: 'account-users', permission: 'read' },
    { fn: registerCreateRoleTool, category: 'account-users', permission: 'write' },
    { fn: registerUpdateRoleTool, category: 'account-users', permission: 'write' },
    { fn: registerDeleteRoleTool, category: 'account-users', permission: 'write' },

    // --- Account SSO ---
    { fn: registerListSamlIdpsTool, category: 'account-sso', permission: 'read' },
    { fn: registerCreateSamlIdpTool, category: 'account-sso', permission: 'write' },
    { fn: registerUpdateSamlIdpTool, category: 'account-sso', permission: 'write' },
    { fn: registerDeleteSamlIdpTool, category: 'account-sso', permission: 'write' },
    { fn: registerListExternalUserGroupsTool, category: 'account-sso', permission: 'read' },
    { fn: registerCreateExternalUserGroupTool, category: 'account-sso', permission: 'write' },
    { fn: registerUpdateExternalUserGroupTool, category: 'account-sso', permission: 'write' },
    { fn: registerDeleteExternalUserGroupTool, category: 'account-sso', permission: 'write' },
    { fn: registerListExternalUsersTool, category: 'account-sso', permission: 'read' },

    // --- Account cloud ---
    { fn: registerGetCloudAccessStatusTool, category: 'account-cloud', permission: 'read' },
    { fn: registerGetCloudUserInfoTool, category: 'account-cloud', permission: 'read' },
    { fn: registerGetMfaStatusTool, category: 'account-cloud', permission: 'read' },
    { fn: registerGetRemoteBindingStatusTool, category: 'account-cloud', permission: 'read' },
    { fn: registerSetMfaStatusTool, category: 'account-cloud', permission: 'write' },

    // --- Schedules ---
    { fn: registerGetUpgradeScheduleListTool, category: 'schedules', permission: 'read' },
    { fn: registerGetRebootScheduleListTool, category: 'schedules', permission: 'read' },
    { fn: registerGetPoeScheduleListTool, category: 'schedules', permission: 'read' },
    { fn: registerGetPortScheduleListTool, category: 'schedules', permission: 'read' },
    { fn: registerCreatePortScheduleTool, category: 'schedules', permission: 'write' },
    { fn: registerUpdatePortScheduleTool, category: 'schedules', permission: 'write' },
    { fn: registerDeletePortScheduleTool, category: 'schedules', permission: 'write' },
    { fn: registerGetPortSchedulePortsTool, category: 'schedules', permission: 'read' },

    // --- Site templates ---
    { fn: registerGetSiteTemplateListTool, category: 'sites', permission: 'read' },
    { fn: registerGetSiteTemplateDetailTool, category: 'sites', permission: 'read' },
    { fn: registerGetSiteTemplateConfigTool, category: 'sites', permission: 'read' },

    // --- Networking parity writes (resourceMutationShared engine) ---
    { fn: registerCreateLanDnsRuleTool, category: 'network-lan', permission: 'write' },
    { fn: registerUpdateLanDnsRuleTool, category: 'network-lan', permission: 'write' },
    { fn: registerDeleteLanDnsRuleTool, category: 'network-lan', permission: 'write' },
    { fn: registerCreateStaticRouteTool, category: 'network-routing', permission: 'write' },
    { fn: registerUpdateStaticRouteTool, category: 'network-routing', permission: 'write' },
    { fn: registerDeleteStaticRouteTool, category: 'network-routing', permission: 'write' },
    { fn: registerCreatePolicyRouteTool, category: 'network-routing', permission: 'write' },
    { fn: registerUpdatePolicyRouteTool, category: 'network-routing', permission: 'write' },
    { fn: registerDeletePolicyRouteTool, category: 'network-routing', permission: 'write' },
    { fn: registerCreatePortForwardingRuleTool, category: 'network-nat', permission: 'write' },
    { fn: registerUpdatePortForwardingRuleTool, category: 'network-nat', permission: 'write' },
    { fn: registerDeletePortForwardingRuleTool, category: 'network-nat', permission: 'write' },
    { fn: registerCreateOneToOneNatTool, category: 'network-nat', permission: 'write' },
    { fn: registerUpdateOneToOneNatTool, category: 'network-nat', permission: 'write' },
    { fn: registerDeleteOneToOneNatTool, category: 'network-nat', permission: 'write' },
    { fn: registerCreateDdnsEntryTool, category: 'network-services', permission: 'write' },
    { fn: registerUpdateDdnsEntryTool, category: 'network-services', permission: 'write' },
    { fn: registerDeleteDdnsEntryTool, category: 'network-services', permission: 'write' },
    { fn: registerCreateGroupProfileTool, category: 'profiles', permission: 'write' },
    { fn: registerUpdateGroupProfileTool, category: 'profiles', permission: 'write' },
    { fn: registerDeleteGroupProfileTool, category: 'profiles', permission: 'write' },
    { fn: registerCreateMdnsRuleTool, category: 'network-services', permission: 'write' },
    { fn: registerUpdateMdnsRuleTool, category: 'network-services', permission: 'write' },
    { fn: registerDeleteMdnsRuleTool, category: 'network-services', permission: 'write' },
    { fn: registerCreateLanProfileTool, category: 'network-lan', permission: 'write' },
    { fn: registerUpdateLanProfileTool, category: 'network-lan', permission: 'write' },
    { fn: registerDeleteLanProfileTool, category: 'network-lan', permission: 'write' },
    { fn: registerCreateWlanGroupTool, category: 'wireless-ssid', permission: 'write' },
    { fn: registerUpdateWlanGroupTool, category: 'wireless-ssid', permission: 'write' },
    { fn: registerDeleteWlanGroupTool, category: 'wireless-ssid', permission: 'write' },
    { fn: registerCreateSsidTool, category: 'wireless-ssid', permission: 'write' },
    { fn: registerDeleteSsidTool, category: 'wireless-ssid', permission: 'write' },
    { fn: registerCreateLanNetworkTool, category: 'network-lan', permission: 'write' },
    { fn: registerUpdateLanNetworkTool, category: 'network-lan', permission: 'write' },
    { fn: registerDeleteLanNetworkTool, category: 'network-lan', permission: 'write' },
    { fn: registerCreateUrlFilterRuleTool, category: 'firewall-acl', permission: 'write' },
    { fn: registerUpdateUrlFilterRuleTool, category: 'firewall-acl', permission: 'write' },
    { fn: registerDeleteUrlFilterRuleTool, category: 'firewall-acl', permission: 'write' },
    { fn: registerCreateMacFilterTool, category: 'wireless-auth', permission: 'write' },
    { fn: registerUpdateMacFilterTool, category: 'wireless-auth', permission: 'write' },
    { fn: registerDeleteMacFilterTool, category: 'wireless-auth', permission: 'write' },
    { fn: registerUpdateSiteToSiteVpnTool, category: 'vpn', permission: 'write' },
    { fn: registerDeleteSiteToSiteVpnTool, category: 'vpn', permission: 'write' },
    { fn: registerUpdateClientToSiteVpnServerTool, category: 'vpn', permission: 'write' },
    { fn: registerDeleteClientToSiteVpnServerTool, category: 'vpn', permission: 'write' },
    { fn: registerUpdateClientToSiteVpnClientTool, category: 'vpn', permission: 'write' },
    { fn: registerDeleteClientToSiteVpnClientTool, category: 'vpn', permission: 'write' },
    { fn: registerUpdateWireguardTool, category: 'vpn', permission: 'write' },
    { fn: registerCreateVpnUserTool, category: 'vpn', permission: 'write' },
    { fn: registerUpdateVpnUserTool, category: 'vpn', permission: 'write' },
    { fn: registerDeleteVpnUserTool, category: 'vpn', permission: 'write' },
    { fn: registerCreateSslVpnResourceTool, category: 'vpn', permission: 'write' },
    { fn: registerUpdateSslVpnResourceTool, category: 'vpn', permission: 'write' },
    { fn: registerDeleteSslVpnResourceTool, category: 'vpn', permission: 'write' },
    { fn: registerCreateSslVpnResourceGroupTool, category: 'vpn', permission: 'write' },
    { fn: registerUpdateSslVpnResourceGroupTool, category: 'vpn', permission: 'write' },
    { fn: registerDeleteSslVpnResourceGroupTool, category: 'vpn', permission: 'write' },
    { fn: registerCreateSslVpnUserGroupTool, category: 'vpn', permission: 'write' },
    { fn: registerUpdateSslVpnUserGroupTool, category: 'vpn', permission: 'write' },
    { fn: registerDeleteSslVpnUserGroupTool, category: 'vpn', permission: 'write' },
    { fn: registerCreateSslVpnLockTool, category: 'vpn', permission: 'write' },
    { fn: registerUpdateSslVpnLockTool, category: 'vpn', permission: 'write' },
    { fn: registerDeleteSslVpnLockTool, category: 'vpn', permission: 'write' },
    { fn: registerSetEoGreTunnelConfigTool, category: 'vpn', permission: 'write' },
    { fn: registerDeleteWireguardTool, category: 'vpn', permission: 'write' },
    { fn: registerDeleteWireguardPeerTool, category: 'vpn', permission: 'write' },
    { fn: registerCreateVoucherGroupTool, category: 'hotspot-vouchers', permission: 'write' },
    { fn: registerDeleteVoucherGroupTool, category: 'hotspot-vouchers', permission: 'write' },
    { fn: registerSetUpnpSettingTool, category: 'network-services', permission: 'write' },
    { fn: registerSetAlgSettingTool, category: 'network-services', permission: 'write' },
    { fn: registerSetSnmpSettingTool, category: 'network-services', permission: 'write' },
    { fn: registerSetAttackDefenseSettingTool, category: 'firewall-traffic', permission: 'write' },
    { fn: registerSetIpsConfigTool, category: 'firewall-ids', permission: 'write' },
    { fn: registerLocateDeviceTool, category: 'devices-general', permission: 'write' },
    { fn: registerForceProvisionDeviceTool, category: 'devices-general', permission: 'write' },
    { fn: registerAdoptDeviceTool, category: 'devices-general', permission: 'write' },
    { fn: registerStartDeviceOnlineUpgradeTool, category: 'devices-general', permission: 'write' },
    { fn: registerRecoverSwitchPortPoeTool, category: 'devices-switch', permission: 'write' },
    { fn: registerCreateSwitchPortTagTool, category: 'devices-switch', permission: 'write' },
    { fn: registerUpdateSwitchPortTagTool, category: 'devices-switch', permission: 'write' },
    { fn: registerDeleteSwitchPortTagTool, category: 'devices-switch', permission: 'write' },
    { fn: registerSetSwitchGeneralConfigTool, category: 'devices-switch', permission: 'write' },
    { fn: registerStartSwitchCableTestTool, category: 'devices-switch', permission: 'write' },
    { fn: registerCancelSwitchCableTestTool, category: 'devices-switch', permission: 'write' },
    { fn: registerClearSwitchPortCountersTool, category: 'devices-switch', permission: 'write' },
    { fn: registerSetClientNameTool, category: 'clients', permission: 'write' },
    { fn: registerSetClientLockToApTool, category: 'clients', permission: 'write' },
    { fn: registerAuthorizeHotspotClientTool, category: 'clients', permission: 'write' },
    { fn: registerUnauthorizeHotspotClientTool, category: 'clients', permission: 'write' },
    { fn: registerListMdnsRulesTool, category: 'network-services', permission: 'read' },
    { fn: registerListVoucherGroupsTool, category: 'hotspot-vouchers', permission: 'read' },
    { fn: registerGetVoucherSummaryTool, category: 'hotspot-vouchers', permission: 'read' },
    { fn: registerListHotspotAuthRecordsTool, category: 'hotspot-portal', permission: 'read' },
    { fn: registerGetHotspotStatisticsTool, category: 'hotspot-portal', permission: 'read' },
    { fn: registerDisconnectHotspotAuthRecordTool, category: 'hotspot-portal', permission: 'write' },
    { fn: registerListHotspotLocalUsersTool, category: 'hotspot-users', permission: 'read' },
    { fn: registerCreateHotspotLocalUserTool, category: 'hotspot-users', permission: 'write' },
    { fn: registerUpdateHotspotLocalUserTool, category: 'hotspot-users', permission: 'write' },
    { fn: registerDeleteHotspotLocalUserTool, category: 'hotspot-users', permission: 'write' },
    { fn: registerListHotspotOperatorsTool, category: 'hotspot-users', permission: 'read' },
    { fn: registerCreateHotspotOperatorTool, category: 'hotspot-users', permission: 'write' },
    { fn: registerUpdateHotspotOperatorTool, category: 'hotspot-users', permission: 'write' },
    { fn: registerDeleteHotspotOperatorTool, category: 'hotspot-users', permission: 'write' },

    // --- Composite / troubleshooting tools ---
    { fn: registerGetNetworkHealthSummaryTool, category: 'dashboard', permission: 'read' },
    { fn: registerGetGatewayHealthTool, category: 'devices-gateway', permission: 'read' },
    { fn: registerDiagnoseClientTool, category: 'client-insights', permission: 'read' },
    { fn: registerGetSecurityOverviewTool, category: 'security-threat', permission: 'read' },

    // --- Dashboard ---
    { fn: registerGetDashboardWifiSummaryTool, category: 'dashboard', permission: 'read' },
    { fn: registerGetDashboardSwitchSummaryTool, category: 'dashboard', permission: 'read' },
    { fn: registerGetDashboardTrafficActivitiesTool, category: 'dashboard', permission: 'read' },
    { fn: registerGetDashboardPoEUsageTool, category: 'dashboard', permission: 'read' },
    { fn: registerGetDashboardTopCpuUsageTool, category: 'dashboard', permission: 'read' },
    { fn: registerGetDashboardTopMemoryUsageTool, category: 'dashboard', permission: 'read' },
    { fn: registerGetDashboardMostActiveSwitchesTool, category: 'dashboard', permission: 'read' },
    { fn: registerGetDashboardMostActiveEapsTool, category: 'dashboard', permission: 'read' },
    { fn: registerGetDashboardOverviewTool, category: 'dashboard', permission: 'read' },
    { fn: registerGetTrafficDistributionTool, category: 'dashboard', permission: 'read' },
    { fn: registerGetIspLoadTool, category: 'dashboard', permission: 'read' },
];

// ---------------------------------------------------------------------------
// registerAllTools — filters by active categories and permissions, then
// registers matching tools with the MCP server.
// ---------------------------------------------------------------------------

export function registerAllTools(
    server: McpServer,
    client: OmadaClient,
    activeCategories?: Map<ToolCategory, Set<ToolPermission>>,
    options: CatalogOptions = {}
): void {
    const registered = new Set<ToolEntry['fn']>();
    const catalog: CatalogTool[] = [];
    for (const entry of TOOL_REGISTRY) {
        if (entry.category === 'recovery' && !activeCategories?.get('recovery')?.has('write')) continue;
        if (activeCategories && !activeCategories.get(entry.category)?.has(entry.permission)) continue;
        if (registered.has(entry.fn)) continue;
        registered.add(entry.fn);
        const collector = {
            registerTool(
                name: string,
                definition: Pick<CatalogTool, 'description' | 'inputSchema' | 'annotations'>,
                handler: CatalogTool['handler']
            ): void {
                catalog.push(withSiteTemplateOption({ name, ...definition, category: entry.category, permission: entry.permission, handler }));
            },
        } as unknown as McpServer;
        entry.fn(collector, client);
    }
    registerCatalog(server, catalog, options);
    logger.info('Tool categories loaded', { registeredOperations: catalog.length, catalogMode: options.catalogMode ?? 'standard' });
}
