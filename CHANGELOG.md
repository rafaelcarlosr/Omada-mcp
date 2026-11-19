# Changelog

## Unreleased

- refresh `docs/openapi` from Omada software controller 6.3.0.111 (2462 operations in 31 groups, up from 1676 in 18), fetched with the new `scripts/fetch-openapi.mjs`, which replaces the lab controller's address with `controller.example.com`
- regenerate `OMADA_TOOLS.md` with the new `scripts/generate-tools-catalog.mjs`: implementation status now comes from the routes in `src/omadaClient` (406/2462), and CI fails when the catalogue is stale
- generated request schemas follow the 6.3 spec, adding fields such as SIP ALG options, Wi-Fi Calling on SSIDs, SNMPv3 settings and switch-port trust mode; exported schema names are unchanged
- `setApConfig` with `configType: port-config` uses the per-port `PATCH aps/{apMac}/ports/{port}` route, because 6.3 removed the collection-level PATCH; the port comes from `payload.lanPort`
- deprecate `backupController` and `restoreController`: controller 6.3 removed the self-server controller backup/restore endpoints from the Open API (site-level self-server backup and file-server backup/restore remain)
- deprecate `setDeviceLed`: its `devices/{mac}/led-setting` route has never been part of the official Open API; set `ledSetting` through `setApConfig` (general-config) or `setGatewayConfig`
- verify the readable OpenVPN `accountPassword` boolean after `updateClientToSiteVpnServer` instead of treating it as a write-only secret
- one-to-one NAT write tools read existing rules through the existing `listOneToOneNatRules` operation instead of a duplicate implementation
- add 15 preview-first controller tools, each validated on the 6.3.0.111 lab controller with preview, single apply, readback verification and cleanup: `getBackupSchedule`/`setBackupSchedule` (maintenance), `createRole`/`updateRole`/`deleteRole` (account-users, built-in roles refused), `setMfaStatus` (account-cloud), and the new account-sso category (`listSamlIdps`, `createSamlIdp`, `updateSamlIdp`, `deleteSamlIdp`, `listExternalUserGroups`, `createExternalUserGroup`, `updateExternalUserGroup`, `deleteExternalUserGroup`, `listExternalUsers`)
- document 6.3 Open API behavior found in the lab: user-management routes (`/users`, `/users/local`, `/users/cloud`, `/roles/available`) need the authorization-code grant and return -44118 to this client-credentials server, so user CRUD is not implemented; SAML IdP certificates must be the base64 of the complete PEM file and IdP rows are keyed by `id`; a disabled backup schedule ignores timing and retention changes
- the catalogue generator now recognises `this.request.*(this.buildPath(...))` calls, which also marks seven existing read routes (sites, devices, clients, dashboard activity) as implemented
- add 18 preview-first schedule and hotspot tools, validated on the 6.3.0.111 lab with apply, readback and cleanup (`disconnectHotspotAuthRecord` only by preview and its refusal path, as the lab has no clients): time range profiles (`createTimeRangeProfile`, `updateTimeRangeProfile`, `deleteTimeRangeProfile`), port schedules (`createPortSchedule`, `updatePortSchedule`, `deletePortSchedule`), hotspot local users and operators (list/create/update/delete), `listHotspotAuthRecords`, `disconnectHotspotAuthRecord`, `getHotspotStatistics` and `getVoucherSummary`; the `hotspot-portal` and `hotspot-users` categories are now active
- hotspot local-user and operator passwords, which controller 6.3 returns in clear text, are redacted in list results and previews and treated as write-only during verification
- fix `listTimeRangeProfiles`, which failed on controller 6.3 because the endpoint now returns a bare array instead of a page
- document 6.3 behavior found in the lab: modifying a hotspot local user requires at least one portal ID even though creation accepts `applyToAllPortals` alone; operators need a complex password; a time range still used by a port schedule cannot be deleted (-34555)
- add 28 preview-first VPN tools, validated on the 6.3.0.111 lab with apply, readback and cleanup (the per-VPN status lists only reach the controller, as the lab has no VPN tunnels): VPN user accounts for all protocols (`listVpnUsers`, `createVpnUser`, `updateVpnUser`, `deleteVpnUser`, using the v2 list and v3 write routes), SSL VPN resources, resource groups, user groups and locks (list/create/update/delete each, plus `listSslVpnUserGroupUsers`), the EoGRE tunnel (`getEoGreTunnelConfig`, `setEoGreTunnelConfig`) and the status lists `listVpnServerStatus`, `listVpnServerClientStatus`, `listVpnClientStatus`, `listSiteToSiteVpnStatus` and `listSiteToSiteVpnPeerStatus`
- `fetchPaginated` accepts a smaller page size for routes that cap it; the VPN status lists reject page sizes above 100
- document 6.3 VPN behavior found in the lab: SSL VPN resource, resource-group and user-group names cannot be changed after creation; VPN user updates need the complete account including the password; deleting an SSL VPN user group succeeds even while users belong to it; the EoGRE setting is replaced as a whole; creating client-to-site VPN servers through the v2 route is rejected with a generic -1001 on a site without an adopted gateway, so server, client and site-to-site creation remain unimplemented
- validate the device tools on real hardware adopted only in the 6.3.0.111 lab (SG2008P v3.20, firmware 3.20.19; EAP610 v3.0, firmware 1.6.0): `adoptDevice`, `locateDevice`, `forceProvisionDevice`, `setSwitchPorts` (name, status, PoE, profile override, single and multi-port), `recoverSwitchPortPoe` (the PoE-powered AP rebooted and came back), `setApConfig` (general-config), `setApRadio` (radio on/off, transmit power), `createSsid`/`updateSsid`/`deleteSsid` and the WLAN group tools
- `setSwitchPorts`: controller 6.3 rejects the dedicated `poe-mode` and `profile-override` PUT routes with -1001 on the SG2008P; after that validation rejection (nothing applied) the tool applies the same change once per port through `PATCH switches/{mac}/ports/{port}`, sending the port's current name and profile as 6.3 requires
- `setSwitchPorts` reports the controller's error code and message when a write is rejected, for example -33854 when the profile has VLAN configuration disabled; transport errors stay generic
- `updateSsid` accepts the 6.3 readback of SSIDs without a custom VLAN (`vlanSetting.customConfig: {}`), and open SSIDs, for which 6.3 omits `pmfMode` and `enable11r` (both require WPA, so PMF disabled and 802.11r off are filled in); `createSsid` now verifies open SSIDs instead of reporting them unverifiable
- `setApPowerSaving` refuses APs for which 6.3 returns no power-saving setting at all (EAP610), already in preview, instead of failing at apply time
- add 22 switch tools in a new `SwitchOperations` client, validated on the lab SG2008P: 15 reads (site-wide port PoE, overview, counters and ports view; per-switch LLDP neighbors, VLAN interfaces, port/LAG networks, network detail, existing networks, DHCP users, DDM, health detail and timeline; port labels) and 7 preview-first writes (`createSwitchPortTag`, `updateSwitchPortTag`, `deleteSwitchPortTag`, `setSwitchGeneralConfig` without the SDM template, `startSwitchCableTest` refusing the uplink and ports with connected devices unless `allowDisruption`, `cancelSwitchCableTest`, `clearSwitchPortCounters`)
- document 6.3 switch behavior found in the lab: the switch health routes take epoch milliseconds (seconds fail or return 1970 buckets); the general-config `tagIds` are device tags, not port labels; PATCH general-config answers with the whole device record
- add 21 AP and client tools validated on the lab EAP610 and real clients: 10 AP reads (AFC, LAN traffic, interference detection status, L3 access, LAG, management WLAN, port VLANs, SSID overrides, RF scan result, lock-to-AP candidates), 9 client reads (connection history, timeline, health detail and timeline, filter options, type corrections, link topology, 5-minute/hourly/daily statistics, incident counts) and 2 preview-first AP writes: `setApSsidOverrides` (per-AP SSID enable, name, password and VLAN, verified against the effective SSID state, including removing an override) and `startApRfScan`
- add 29 site profile tools that need no adopted device, validated on a device-less 6.3.0.111 lab site with preview, apply, readback, a repeated no-op update and cleanup: rate limit profiles, gateway QoS service types, Bonjour services (`createMdnsProfile`, `updateMdnsProfile`, `deleteMdnsProfile`), APN profiles (with `listApnProfiles`) and Wi-Fi calling profiles (with `listWifiCallingProfiles` and `copyWifiCallingProfile`) in `profiles`; OUI profiles and `listOuiProfileSummaries` in `wireless-auth`; and seven reads of switch OUI-based VLAN rules, their VLANs and supporting switches
- the controller's own profiles (Default rate limit, built-in service types such as ALL/FTP/SSH, built-in Bonjour services and APN profiles) are refused before any request; `runUpdate` accepts the same `guard` option as `runDelete`
- document 6.3 profile behavior found in the lab: the Bonjour service-ID limit in the official spec applies to each ID instead of the list, so these tools validate `_name._proto.local` IDs and up to three of them; Wi-Fi calling profiles need a name although the spec marks it optional; OUIs are stored in upper case; service types keep only the fields of their protocol; creating an OUI-based VLAN rule fails with -34290 on a site without a supporting switch, so rule writes wait for hardware tests
- duplicate-name errors use "An" before labels that start with a vowel ("An APN profile named ...")
- add 25 site service and setting tools that need no adopted device, validated on the device-less lab site with preview, apply, readback, a repeated no-op and restore: PoE schedules and IP-MAC bindings (create/update/delete), IoT transport streams (`listIotServers` and create/update/delete), the site mail server (`getSiteMailServer`, `setSiteMailServer`), and settings for site LEDs, multicast rate limits, remember-devices, the speed test schedule, the portal logout domain, the IoT radio and intelli-recover, with reads for MLD, speed test, portal logout, portals with logout, IoT radio and intelli-recover
- mask `authCode` (mail server authorization code) and `passcode` (IoT console passcode), which controller 6.3 returns in clear text, in every tool result and log
- document 6.3 site-setting behavior found in the lab: a multicast rate (`arpPps` and others) is kept only while that protocol's `*Enable` flag is true, so the tool refuses rates that would be dropped; the IoT radio ignores or rejects partial updates, so `setIotRadioSetting` sends the change merged over the current values; intelli-recover `limitNum` must be 3-10; IP-MAC binding updates replace the whole binding and new bindings default to exporting a DHCP reservation; the mail server has no delete route; reboot schedules (-1 without devices), application control (-35112 without a gateway) and the MLD write (-33498 without a gateway) wait for the hardware phase
- document 6.3 AP behavior found in the lab: the SSID override readback reports effective values and omits the override flags; the EAP610 rejects RF scanning (-34809), antenna, bridge and interference detection; an RF scan needs an SSID on each scanned band (-34800)
- explain the controller's `General error.` from the gateway ACL list (`listOsgAcls`, and the `updateGatewayAcl`/`deleteAcl` lookups): on controller 6.2.14.11 the Open API fails the whole list when a stored gateway ACL rule has no state mode, a controller NullPointerException rather than a request problem

## 0.19.0-rc.2 - 2026-11-11

- bundle a network/shield icon and advertise it in MCP server metadata for compatible clients
- update `follow-redirects` to its patched compatible version
- add 68 preview-first networking tools for parity with the UniFi MCP server's networking workflows: LAN networks, switch port profiles, WLAN groups and SSIDs, group profiles, mDNS rules, port forwarding, one-to-one NAT, static and policy routes, LAN DNS, DDNS, UPnP/ALG/SNMP, URL and MAC filtering, attack defense, IDS/IPS, VPN update/delete, device locate/provision/adopt (default login only)/upgrade, PoE recovery, client rename/lock-to-AP, hotspot client authorization and voucher groups
- generate strict request schemas from the official OpenAPI specs and validate controller-enforced requirements before preview
- share one mutation engine for conflict checks, single writes, error-coded controller rejections and bounded readback verification
- fix `listSiteToSiteVpns` and `listGroupProfiles`, which failed on controllers returning bare arrays
- incorporate PR #13 by Cracker8x; add the read-only `listSitesSettingIotDevices` tool (`devices-general`) listing devices that support Bluetooth/iBeacon advertising
- record exploratory live-controller findings (not release validation) in [networking writes validation](docs/operations/networking-writes-validation.md)

Automated checks and packaging evidence: [rc.2 validation](docs/operations/0.19.0-rc.2-validation.md). Disposable-controller/hardware validation remains pending; this is a prerelease and does not update `latest`.

## 0.19.0-rc.1 - 2026-10-24

- default all writes to preview, separate explicit recovery permissions, and distinguish submitted changes from verified readback
- serialize request pacing, share token acquisition, bound read retries/pagination, reject malformed envelopes, recover site discovery and normalize client identity with ambiguity checks
- add typed AP radio, restricted SSID basic-setting and guarded switch-port workflows with bounded semantic verification and partial outcomes
- add enabled-operation search/schema discovery, optional compact dispatch, hidden legacy aliases and capability metadata
- add Wi-Fi, log and camera-client diagnostic composition with timestamps and incomplete-evidence reporting
- incorporate PR #10 by q759k6n9pm-hash; extend shared redaction, restrict optional tool headers, add private CA trust and disable redirects
- remove an unregistered duplicate device-stats implementation, verify README inventory against runtime registration, expand protocol/regression coverage and update compatible dependencies
- document migration, issue #11 registry findings and operation-specific validation; Zod has a remaining high advisory, and stable write-tool release awaits disposable-controller/hardware evidence

See [migration](docs/operations/0.19-migration.md) and [validation](docs/operations/0.19-validation.md). This candidate does not upgrade the live installation.

## 0.18.0 - 2026-10-20

- added site auto-discovery when neither a tool argument nor `OMADA_SITE_ID` supplies a site: single-site controllers are selected automatically; controllers with no sites or multiple sites return an explanatory error
- added `createSwitchAcl` and `updateSwitchAcl` tools with schema validation, dry-run previews, and existing-rule checks for updates
- expanded the default `safe-read` profile with firewall ACL and traffic read tools
- reorganized README tool tables into collapsible read and write sections
- configured repository engineering skills with GitHub Issues, default triage labels, and single-context domain documentation conventions
- updated CI and publishing actions to releases using the Node.js 24 runtime
- synchronized package and lockfile versions for the release

## 0.17.0 - 2026-04-05

- added explicit two-step `confirmDangerous` confirmation gate to all four restore tools (`restoreController`, `restoreControllerFromFileServer`, `restoreSites`, `restoreSitesFromFileServer`) — irreversibility warning surfaces before any execution
- fixed three API contract bugs: `getRogueApExport` format values corrected to spec (`'0'`/`'1'`), threat API timestamps converted to seconds, `getThreatList` site scoping via `siteList` param
- expanded `ops-write` capability profile to include `maintenance:rw`, `logs:r`, `network-wan:r`, `security-threat:r`, `vpn:r`
- documented `confirmDangerous` scope and limitations in `CLAUDE.md` and `README.md`
- added `AGENTS.md` symlink to `CLAUDE.md` for cross-agent instruction pickup
- fixed Docker publish workflow to use dynamic repository owner

## 0.16.0 - 2026-04-03

- promoted the hardened Omada MCP platform to a stdio-first production baseline
- completed Phase 3 administrative tooling for AP, gateway, DHCP, ACL, and traffic-control workflows
- aligned server version reporting with package metadata
- tightened legacy HTTP mode so it remains loopback-only even when explicitly enabled for lab use
- refreshed README, Docker README, and AI-agent instructions to match the current platform behavior
- strengthened CI with symlink validation and cleaned release metadata for the published package and container image
