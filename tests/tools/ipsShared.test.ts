import { describe, expect, it, vi } from 'vitest';

import { allowEntryRequest, allPages, checkAllowEntry } from '../../src/tools/ipsShared.js';

describe('tools/ipsShared', () => {
    it('reads every page', async () => {
        const fetch = vi
            .fn()
            .mockResolvedValueOnce({ data: Array.from({ length: 100 }, (_, index) => ({ id: `${index}` })), totalRows: 101 })
            .mockResolvedValueOnce({ data: [{ id: 'last' }], totalRows: 101 });
        expect(await allPages(fetch)).toHaveLength(101);
        expect(fetch).toHaveBeenNthCalledWith(2, 2, 100);
        await expect(allPages(vi.fn().mockResolvedValue(undefined))).rejects.toThrow('unexpected collection shape');
        await expect(allPages(vi.fn().mockResolvedValue({ data: [] }))).resolves.toEqual([]);
    });

    it('maps allow list rows to the request shape', () => {
        expect(allowEntryRequest({ id: 'a', direction: 0, trafficType: 0, trafficSource: '10.0.0.1' })).toEqual({
            id: 'a',
            direction: 0,
            trafficType: 0,
            ipAddress: '10.0.0.1',
        });
        expect(allowEntryRequest({ id: 'b', direction: 1, trafficType: 1, trafficSource: 'n1' })).toMatchObject({ network: 'n1' });
        expect(allowEntryRequest({ id: 'c', direction: 2, trafficType: 2, trafficSource: '10.0.0.0/24' })).toMatchObject({ subnet: '10.0.0.0/24' });
        expect(allowEntryRequest({ id: 'd', direction: 2, trafficType: 9 })).toEqual({ id: 'd', direction: 2, trafficType: 9 });
    });

    it('checks the target field of each traffic type', () => {
        expect(() => checkAllowEntry({ direction: 0, trafficType: 0, ipAddress: '10.0.0.1' })).not.toThrow();
        expect(() => checkAllowEntry({ direction: 0, trafficType: 1 })).toThrow('trafficType 1 needs network');
        expect(() => checkAllowEntry({ direction: 0, trafficType: 7 })).toThrow('trafficType must be 0');
        expect(() => checkAllowEntry({ trafficType: 2, subnet: '10.0.0.0/24' })).toThrow('direction is required');
    });
});
