import { describe, expect, it, vi } from 'vitest';

import type { OmadaClient } from '../../src/omadaClient/index.js';
import { assertPoeCapablePorts } from '../../src/tools/poeScheduleShared.js';

const rows = [
    { switchMac: 'AA-BB-CC-DD-EE-01', port: 1, supportPoe: true },
    { switchMac: 'AA-BB-CC-DD-EE-01', port: 5, supportPoe: false },
    { switchMac: 'AA-BB-CC-DD-EE-01', port: 6 },
    { port: 7 },
];

function clientWith(value: unknown): Pick<OmadaClient, 'listSwitchPortOverview'> {
    return { listSwitchPortOverview: vi.fn(async () => value) } as unknown as Pick<OmadaClient, 'listSwitchPortOverview'>;
}

describe('tools/poeScheduleShared', () => {
    it('accepts PoE ports and ports whose PoE support is not reported, matching MACs in any format', async () => {
        const client = clientWith(rows);
        await expect(assertPoeCapablePorts(client, { 'aa:bb:cc:dd:ee:01': [1, 6] }, 'site-1', { 'x-h': '1' })).resolves.toBeUndefined();
        expect(client.listSwitchPortOverview).toHaveBeenCalledWith('site-1', { 'x-h': '1' });
    });

    it('lists every port without PoE or missing from the overview in one error', async () => {
        await expect(
            assertPoeCapablePorts(clientWith(rows), { 'AA-BB-CC-DD-EE-01': [5, 7], 'AA-BB-CC-DD-EE-09': [1] }, undefined, undefined)
        ).rejects.toThrow(
            "Invalid PoE schedule ports: port 5 on switch AA-BB-CC-DD-EE-01 does not supply PoE; port 7 on switch AA-BB-CC-DD-EE-01 is not in this site's switch port overview; port 1 on switch AA-BB-CC-DD-EE-09 is not in this site's switch port overview. No request was sent."
        );
    });

    it('refuses when the port overview is unreadable', async () => {
        await expect(assertPoeCapablePorts(clientWith(undefined), { 'AA-BB-CC-DD-EE-01': [1] }, undefined, undefined)).rejects.toThrow(
            'unexpected collection shape'
        );
    });
});
