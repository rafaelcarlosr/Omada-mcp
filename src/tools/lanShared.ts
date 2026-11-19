import type { RecordLike } from './resourceMutationShared.js';

const records = (value: unknown): RecordLike[] =>
    Array.isArray(value) ? value.filter((item): item is RecordLike => typeof item === 'object' && item !== null) : [];

/** AP OUI VLAN rules are read with ssidList [{ ssidId, ssidName }] and named profiles; requests take IDs only. */
export function apOuiRuleRequest(row: RecordLike): RecordLike {
    return {
        id: row.id,
        enable: row.enable,
        name: row.name,
        ssidIdList: records(row.ssidList).map((ssid) => ssid.ssidId),
        ruleCombine: records(row.ruleCombine).map(({ vlanId, priority, ouiProfileId }) => ({ vlanId, priority, ouiProfileId })),
    };
}

/** DNS proxy: the setting object each proxy type needs (0 DNSSEC, 1 DoH, 2 DoT, 3 DNS override). */
export const DNS_PROXY_SETTING: Record<number, string> = { 0: 'dnsSecSetting', 1: 'dohSetting', 2: 'dotSetting', 3: 'dnsOverrideSetting' };
