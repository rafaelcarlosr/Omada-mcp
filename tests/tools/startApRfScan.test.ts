import { describe, expect, it, vi } from 'vitest';

import { OmadaApiError } from '../../src/omadaClient/request.js';
import { registerStartApRfScanTool } from '../../src/tools/startApRfScan.js';
import { toolHarness } from '../helpers/toolHarness.js';

const apMac = 'AA-BB-CC-DD-EE-02';

describe('tools/startApRfScan', () => {
    it('validates unique documented bands', () => {
        const schema = toolHarness(registerStartApRfScanTool, {}).schema();
        expect(() => schema.parse({ apMac, radioIds: [] })).toThrow();
        expect(() => schema.parse({ apMac, radioIds: [0, 0] })).toThrow();
        expect(() => schema.parse({ apMac, radioIds: [4] })).toThrow();
    });

    it('previews the last result, then starts the scan once', async () => {
        const fake = { getApRfScanResult: vi.fn().mockResolvedValue({ status: 1 }), startApRfScan: vi.fn().mockResolvedValue(undefined) };
        const harness = toolHarness(registerStartApRfScanTool, fake);
        await expect(harness.invoke({ apMac, radioIds: [0, 1] })).resolves.toMatchObject({
            status: 'planned',
            result: { target: { radioIds: [0, 1], lastResult: { status: 1 } } },
        });
        expect(fake.startApRfScan).not.toHaveBeenCalled();
        await harness.invoke({ apMac, radioIds: [0, 1], siteId: 's1', dryRun: false });
        expect(fake.startApRfScan).toHaveBeenCalledWith(apMac, { radioIdList: [0, 1] }, 's1', undefined);
    });

    it('surfaces the controller refusal for unsupported APs', async () => {
        const fake = {
            getApRfScanResult: vi.fn().mockResolvedValue({}),
            startApRfScan: vi.fn().mockRejectedValue(new OmadaApiError(-34809, 'This AP does not support RF Scanning.')),
        };
        await expect(toolHarness(registerStartApRfScanTool, fake).invoke({ apMac, radioIds: [0], dryRun: false })).rejects.toThrow(
            '(errorCode -34809)'
        );
    });
});
