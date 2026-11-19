import { describe, expect, it } from 'vitest';

import { mergedSsidSection, ssidSectionOf } from '../../src/tools/wirelessShared.js';

const detail = {
    ssidEnable: true,
    bandSteer: { mode: 1 },
    dhcpOption82: { dhcpEnable: false },
    loadBalance: { enable: false },
    macFilter: { macFilterEnable: false },
    multiCast: { multiCastEnable: true },
    rateControl: { rate2gCtrlEnable: false },
    clientRateLimit: { customSetting: { downLimitEnable: false } },
    ssidRateLimit: { customSetting: { upLimitEnable: false } },
    wifiCallingEnable: false,
    wlanSchedule: { wlanScheduleEnable: false },
};

describe('tools/wirelessShared', () => {
    it('maps each section to the detail fields it changes', () => {
        expect(ssidSectionOf(detail, 'band-steer')).toEqual({ mode: 1 });
        expect(ssidSectionOf(detail, 'dhcp-option')).toEqual({ dhcpEnable: false });
        expect(ssidSectionOf(detail, 'enable')).toEqual({ ssidEnable: true });
        expect(ssidSectionOf(detail, 'load-balance')).toEqual({ enable: false });
        expect(ssidSectionOf(detail, 'mac-filter')).toEqual({ macFilterEnable: false });
        expect(ssidSectionOf(detail, 'multicast-config')).toEqual({ multiCastEnable: true });
        expect(ssidSectionOf(detail, 'rate-control')).toEqual({ rate2gCtrlEnable: false });
        expect(ssidSectionOf(detail, 'rate-limit')).toEqual({ clientRateLimit: detail.clientRateLimit, ssidRateLimit: detail.ssidRateLimit });
        expect(ssidSectionOf(detail, 'wifi-calling')).toEqual({ wifiCallingEnable: false, wifiCallingId: undefined });
        expect(ssidSectionOf(detail, 'wlan-schedule')).toEqual({ wlanScheduleEnable: false });
        expect(ssidSectionOf(detail, 'hotspotv2')).toBeUndefined();
        expect(ssidSectionOf({ bandSteer: [] }, 'band-steer')).toBeUndefined();
        expect(ssidSectionOf(null, 'enable')).toBeUndefined();
    });

    it('merges changes over current values the schema accepts', () => {
        expect(mergedSsidSection('band-steer', { mode: 3, extra: true }, { mode: 1 })).toEqual({ mode: 1 });
        expect(mergedSsidSection('wifi-calling', { wifiCallingEnable: true, wifiCallingId: null }, { wifiCallingEnable: false })).toEqual({
            wifiCallingEnable: false,
        });
        expect(mergedSsidSection('enable', undefined, { ssidEnable: true })).toEqual({ ssidEnable: true });
        expect(() => mergedSsidSection('enable', undefined, { unknown: 1 })).toThrow();
        expect(() => mergedSsidSection('multicast-config', undefined, { channelUtil: 90 })).toThrow();
        expect(() => mergedSsidSection('dhcp-option', { dhcpEnable: false }, { dhcpEnable: true, format: 0 })).toThrow(
            'dhcpEnable: true also needs delimiter, circuitId, remoteId. No request was sent.'
        );
        expect(
            mergedSsidSection(
                'rate-control',
                {
                    rate2gCtrlEnable: false,
                    rate5gCtrlEnable: true,
                    lowerDensity5g: 12,
                    higherDensity5g: 54,
                    clientRatesRequire5g: false,
                    sendBeacons5g: false,
                },
                { rate2gCtrlEnable: false }
            )
        ).toMatchObject({ rate5gCtrlEnable: true, lowerDensity5g: 12 });
        expect(
            mergedSsidSection(
                'rate-control',
                {
                    rate2gCtrlEnable: true,
                    lowerDensity2g: 6,
                    higherDensity2g: 54,
                    cckRatesDisable: true,
                    clientRatesRequire2g: false,
                    sendBeacons2g: false,
                    rate5gCtrlEnable: false,
                },
                { rate2gCtrlEnable: false }
            )
        ).toEqual({ rate2gCtrlEnable: false, rate5gCtrlEnable: false });
    });
});
