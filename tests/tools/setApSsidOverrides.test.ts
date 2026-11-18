import { describe, expect, it, vi } from 'vitest';

import { registerSetApSsidOverridesTool } from '../../src/tools/setApSsidOverrides.js';
import { toolHarness } from '../helpers/toolHarness.js';

const apMac = 'AA-BB-CC-DD-EE-02';
const base = { ssidId: 's-1', ssidEntryId: 7, ssidName: 'office', security: 3, vlanEnable: false, ssidEnable: true };

function client(ssidList: unknown[] = [{ ssidId: 's-1', name: 'office', vlanEnable: false }], apGroupId: unknown = 'wlan-1') {
    let entry: Record<string, unknown> = { ...base };
    return {
        getApSsidOverrides: vi.fn(async () => ({ ssidOverrides: [entry], apGroupId })),
        getSsidList: vi.fn(async () => ssidList),
        setApSsidOverrides: vi.fn((_mac: string, body: { ssidOverrides: Record<string, unknown>[] }) => {
            const req = body.ssidOverrides[0];
            entry = {
                ...base,
                ssidEnable: req.ssidEnable ?? entry.ssidEnable,
                ssidName: req.overrideSsidEnable ? req.overrideSsidName : 'office',
                ...(req.overrideVlanEnable ? { vlanEnable: true, vlanId: req.vlanId } : { vlanEnable: false }),
            };
            return Promise.resolve({});
        }),
    };
}

const disable = { ssidOverrides: [{ ssidEntryId: 7, overrideSsidEnable: false, overrideVlanEnable: false, ssidEnable: false }] };
const rename = {
    ssidOverrides: [
        {
            ssidEntryId: 7,
            overrideSsidEnable: true,
            overrideSsidName: 'lab',
            overrideSsidPassword: 'S3cret-pass',
            overrideVlanEnable: true,
            vlanId: 30,
        },
    ],
};

describe('tools/setApSsidOverrides', () => {
    it('previews the effective-state differences without writing or echoing passwords', async () => {
        const fake = client();
        const result = await toolHarness(registerSetApSsidOverridesTool, fake).invoke({ apMac, payload: rename });
        expect(result).toMatchObject({ status: 'planned', result: { alreadyMatches: false } });
        expect(JSON.stringify(result)).not.toContain('S3cret-pass');
        expect(JSON.stringify(result)).toContain('Override passwords are write-only');
        expect(fake.setApSsidOverrides).not.toHaveBeenCalled();
        expect(fake.getSsidList).toHaveBeenCalledWith('wlan-1', undefined, undefined);
    });

    it('applies once and verifies name, VLAN and enable state', async () => {
        const fake = client();
        const harness = toolHarness(registerSetApSsidOverridesTool, fake);
        await expect(harness.invoke({ apMac, payload: rename, dryRun: false })).resolves.toMatchObject({ status: 'verified' });
        await expect(harness.invoke({ apMac, payload: disable, dryRun: false })).resolves.toMatchObject({ status: 'verified' });
        expect(fake.setApSsidOverrides).toHaveBeenCalledTimes(2);
    });

    it('verifies that turning overrides off restores the SSID name and VLAN instead of reporting a no-op', async () => {
        const fake = client([{ ssidId: 's-1', name: 'office', vlanEnable: true, vlanId: 10 }]);
        const harness = toolHarness(registerSetApSsidOverridesTool, fake);
        const preview = await harness.invoke({
            apMac,
            payload: { ssidOverrides: [{ ssidEntryId: 7, overrideSsidEnable: false, overrideVlanEnable: false }] },
        });
        expect(preview).toMatchObject({ result: { alreadyMatches: false } });
        expect(JSON.stringify(preview)).toContain('vlanEnable');
    });

    it('refuses unknown entries and works without a WLAN group id', async () => {
        const fake = client([], null);
        const harness = toolHarness(registerSetApSsidOverridesTool, fake);
        await expect(
            harness.invoke({
                apMac,
                payload: { ssidOverrides: [{ ssidEntryId: 9, overrideSsidEnable: false, overrideVlanEnable: false }] },
                dryRun: false,
            })
        ).rejects.toThrow('SSID entries 9 are not on this AP');
        await expect(harness.invoke({ apMac, payload: disable, dryRun: false })).resolves.toMatchObject({ status: 'verified' });
        expect(fake.getSsidList).not.toHaveBeenCalled();
    });
});
