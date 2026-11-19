import { SSID_SECTIONS, type SsidSection } from '../omadaClient/wireless.js';
import type { RecordLike } from './resourceMutationShared.js';

const isRecord = (value: unknown): value is RecordLike => typeof value === 'object' && value !== null && !Array.isArray(value);

/** The part of an SSID detail (getSsidConfig) that a configuration section changes; undefined when the controller omits it. */
export function ssidSectionOf(detail: unknown, section: SsidSection): RecordLike | undefined {
    if (!isRecord(detail)) return undefined;
    const record = (value: unknown): RecordLike | undefined => (isRecord(value) ? value : undefined);
    switch (section) {
        case 'band-steer':
            return record(detail.bandSteer);
        case 'dhcp-option':
            return record(detail.dhcpOption82);
        case 'enable':
            return { ssidEnable: detail.ssidEnable };
        case 'load-balance':
            return record(detail.loadBalance);
        case 'mac-filter':
            return record(detail.macFilter);
        case 'multicast-config':
            return record(detail.multiCast);
        case 'rate-control':
            return record(detail.rateControl);
        case 'rate-limit':
            return { clientRateLimit: detail.clientRateLimit, ssidRateLimit: detail.ssidRateLimit };
        case 'wifi-calling':
            return { wifiCallingEnable: detail.wifiCallingEnable, wifiCallingId: detail.wifiCallingId };
        case 'wlan-schedule':
            return record(detail.wlanSchedule);
        default:
            return record(detail.hotspotV2Setting);
    }
}

/** Fields the 6.3 controller requires (errorCode -1001) once a switch in the section is on, found in the lab. */
const REQUIRED_WHEN_ENABLED: Partial<Record<SsidSection, Record<string, readonly string[]>>> = {
    'dhcp-option': { dhcpEnable: ['format', 'delimiter', 'circuitId', 'remoteId'] },
    'rate-control': {
        rate2gCtrlEnable: ['lowerDensity2g', 'higherDensity2g', 'clientRatesRequire2g', 'sendBeacons2g'],
        rate5gCtrlEnable: ['lowerDensity5g', 'higherDensity5g', 'clientRatesRequire5g', 'sendBeacons5g'],
        manageRateControl2gEnable: ['manageRateControl2g'],
        manageRateControl5gEnable: ['manageRateControl5g'],
    },
};

/** Complete section body: the current values the spec accepts, overlaid with the requested changes. */
export function mergedSsidSection(section: SsidSection, current: RecordLike | undefined, changes: RecordLike): RecordLike {
    const schema = SSID_SECTIONS[section];
    schema.partial().parse(changes);
    const keys = Object.keys(schema.shape);
    const merged = Object.fromEntries(
        Object.entries({ ...(current ?? {}), ...changes }).filter(([key, value]) => keys.includes(key) && value !== undefined && value !== null)
    );
    for (const [flag, fields] of Object.entries(REQUIRED_WHEN_ENABLED[section] ?? {})) {
        if (merged[flag] !== true) {
            // Rate control refuses the dependent fields of a switched-off band (errorCode -1001).
            if (section === 'rate-control')
                for (const field of [...fields, ...(flag === 'rate2gCtrlEnable' ? ['cckRatesDisable'] : [])]) delete merged[field];
            continue;
        }
        const missing = fields.filter((field) => merged[field] === undefined);
        if (missing.length) throw new Error(`${flag}: true also needs ${missing.join(', ')}. No request was sent.`);
    }
    return schema.parse(merged) as RecordLike;
}
