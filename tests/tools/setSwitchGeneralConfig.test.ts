import { describe, expect, it, vi } from 'vitest';

import { registerSetSwitchGeneralConfigTool } from '../../src/tools/setSwitchGeneralConfig.js';
import { toolHarness } from '../helpers/toolHarness.js';

const mac = 'AA-BB-CC-DD-EE-01';

function client() {
    let state: Record<string, unknown> = { name: 'sw1', ledSetting: 2, jumboFollowSite: true, jumbo: 1518 };
    return {
        getSwitchGeneralConfig: vi.fn(async () => state),
        setSwitchGeneralConfig: vi.fn((_mac: string, body: Record<string, unknown>) => {
            state = { ...state, ...body };
            return Promise.resolve({ mac, name: 'full device record' });
        }),
    };
}

describe('tools/setSwitchGeneralConfig', () => {
    it('does not offer the SDM template and validates fields', () => {
        const schema = toolHarness(registerSetSwitchGeneralConfigTool, client()).schema();
        expect(() => schema.parse({ switchMac: mac, payload: { sdm: { inUse: 'x' } } })).toThrow();
        expect(() => schema.parse({ switchMac: 'bad', payload: { name: 'x' } })).toThrow();
    });

    it('previews differences, then applies once, keeps the result short and verifies', async () => {
        const fake = client();
        const harness = toolHarness(registerSetSwitchGeneralConfigTool, fake);
        await expect(harness.invoke({ switchMac: mac, payload: { name: 'core', ledSetting: 0 } })).resolves.toMatchObject({
            status: 'planned',
            result: { alreadyMatches: false },
        });
        const applied = await harness.invoke({ switchMac: mac, payload: { name: 'core', ledSetting: 0 }, siteId: 's1', dryRun: false });
        expect(applied).toMatchObject({ status: 'verified', result: { applied: {} } });
        expect(fake.setSwitchGeneralConfig).toHaveBeenCalledWith(mac, { name: 'core', ledSetting: 0 }, 's1', undefined);
        expect(fake.getSwitchGeneralConfig).toHaveBeenCalledWith(mac, 's1', undefined);
    });

    it('warns when jumbo settings change', async () => {
        const result = await toolHarness(registerSetSwitchGeneralConfigTool, client()).invoke({
            switchMac: mac,
            payload: { jumboFollowSite: false, jumbo: 9000 },
        });
        expect(JSON.stringify(result)).toContain('jumbo frame size');
    });
});
