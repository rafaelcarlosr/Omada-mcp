import { describe, expect, it, vi } from 'vitest';

import { registerStartSwitchCableTestTool } from '../../src/tools/startSwitchCableTest.js';
import { toolHarness } from '../helpers/toolHarness.js';

const mac = 'AA-BB-CC-DD-EE-01';
const ports = [
    { port: 1, name: 'Port1', isUpperPort: false, downlinkDevices: [{ name: 'ap', mac: 'x' }] },
    { port: 3, name: 'Port3', isUpperPort: false, downlinkDevices: [] },
    { port: 8, name: 'Port8', isUpperPort: true },
];

function client() {
    return { listSitesCableTestSwitchesPorts: vi.fn().mockResolvedValue(ports), startSwitchCableTest: vi.fn().mockResolvedValue(undefined) };
}

describe('tools/startSwitchCableTest', () => {
    it('previews free ports with their state, then starts the test once', async () => {
        const fake = client();
        const harness = toolHarness(registerStartSwitchCableTestTool, fake);
        await expect(harness.invoke({ switchMac: mac, ports: [3] })).resolves.toMatchObject({
            status: 'planned',
            result: { target: { ports: [{ port: 3, name: 'Port3', uplink: false, connectedDevices: [] }] } },
        });
        expect(fake.startSwitchCableTest).not.toHaveBeenCalled();
        await harness.invoke({ switchMac: mac, ports: [3], dryRun: false });
        expect(fake.startSwitchCableTest).toHaveBeenCalledWith(mac, [3], undefined, undefined);
    });

    it('refuses the uplink, ports with devices and unknown ports unless allowed', async () => {
        const fake = client();
        const harness = toolHarness(registerStartSwitchCableTestTool, fake);
        await expect(harness.invoke({ switchMac: mac, ports: [8], dryRun: false })).rejects.toThrow('Ports 8 are the uplink');
        await expect(harness.invoke({ switchMac: mac, ports: [1, 3], dryRun: false })).rejects.toThrow('Ports 1 are the uplink');
        await expect(harness.invoke({ switchMac: mac, ports: [9], dryRun: false })).rejects.toThrow('Ports 9 cannot be cable-tested');
        expect(fake.startSwitchCableTest).not.toHaveBeenCalled();
        await harness.invoke({ switchMac: mac, ports: [1, 8], allowDisruption: true, dryRun: false });
        expect(fake.startSwitchCableTest).toHaveBeenCalledWith(mac, [1, 8], undefined, undefined);
    });
});
