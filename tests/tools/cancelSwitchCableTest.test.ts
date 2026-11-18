import { describe, expect, it, vi } from 'vitest';

import { registerCancelSwitchCableTestTool } from '../../src/tools/cancelSwitchCableTest.js';
import { toolHarness } from '../helpers/toolHarness.js';

describe('tools/cancelSwitchCableTest', () => {
    it('previews the running test, then cancels once', async () => {
        const fake = {
            getCableTestFullResults: vi.fn().mockResolvedValue({ status: 1, data: [] }),
            cancelSwitchCableTest: vi.fn().mockResolvedValue(undefined),
        };
        const harness = toolHarness(registerCancelSwitchCableTestTool, fake);
        await expect(harness.invoke({ switchMac: 'AA-BB-CC-DD-EE-01' })).resolves.toMatchObject({
            status: 'planned',
            result: { target: { current: { status: 1 } } },
        });
        expect(fake.cancelSwitchCableTest).not.toHaveBeenCalled();
        await expect(harness.invoke({ switchMac: 'AA-BB-CC-DD-EE-01', siteId: 's1', dryRun: false })).resolves.toMatchObject({
            result: { writeAcknowledged: true },
        });
        expect(fake.cancelSwitchCableTest).toHaveBeenCalledWith('AA-BB-CC-DD-EE-01', 's1', undefined);
    });
});
