import { describe, expect, it, vi } from 'vitest';

import { registerClearSwitchPortCountersTool } from '../../src/tools/clearSwitchPortCounters.js';
import { toolHarness } from '../helpers/toolHarness.js';

const mac = 'AA-BB-CC-DD-EE-01';

describe('tools/clearSwitchPortCounters', () => {
    it('refuses unknown ports, including on a switch without a port list', async () => {
        const fake = {
            getSwitchDetail: vi
                .fn()
                .mockResolvedValueOnce({ portList: [{ port: 1 }] })
                .mockResolvedValueOnce({}),
            clearSwitchPortCounters: vi.fn(),
        };
        const harness = toolHarness(registerClearSwitchPortCountersTool, fake);
        await expect(harness.invoke({ switchMac: mac, ports: [1, 9], dryRun: false })).rejects.toThrow('Ports 9 do not exist');
        await expect(harness.invoke({ switchMac: mac, ports: [1], dryRun: false })).rejects.toThrow('Ports 1 do not exist');
        expect(fake.clearSwitchPortCounters).not.toHaveBeenCalled();
    });

    it('previews, then resets the counters once with the switch MAC on each port', async () => {
        const fake = {
            getSwitchDetail: vi.fn().mockResolvedValue({ portList: [{ port: 3 }, { port: 4 }] }),
            clearSwitchPortCounters: vi.fn().mockResolvedValue(''),
        };
        const harness = toolHarness(registerClearSwitchPortCountersTool, fake);
        await expect(harness.invoke({ switchMac: mac, ports: [3, 4] })).resolves.toMatchObject({ status: 'planned' });
        await harness.invoke({ switchMac: mac, ports: [3, 4], dryRun: false });
        expect(fake.clearSwitchPortCounters).toHaveBeenCalledWith(
            {
                portList: [
                    { port: 3, switchMac: mac },
                    { port: 4, switchMac: mac },
                ],
            },
            undefined,
            undefined
        );
    });
});
