import { describe, expect, it, vi } from 'vitest';

import { orderOf, runReorder } from '../../src/tools/orderShared.js';

describe('tools/orderShared', () => {
    it('orders rows by index', () => {
        expect(
            orderOf([
                { id: 'b', index: 2 },
                { id: 'a', index: 1 },
            ])
        ).toEqual(['a', 'b']);
    });

    it('refuses incomplete, repeated or unknown orders', async () => {
        const list = vi.fn(async () => [
            { id: 'a', index: 1 },
            { id: 'b', index: 2 },
        ]);
        const write = vi.fn();
        await expect(runReorder({ label: 'rule', ids: ['a', 'a', 'x'], list, write, dryRun: false })).rejects.toThrow(
            'List every rule exactly once in the new order (repeated: a; unknown: x; missing: b). No request was sent.'
        );
        expect(write).not.toHaveBeenCalled();
    });

    it('previews, then writes 1-based indexes and verifies the order', async () => {
        let rows = [
            { id: 'a', index: 1 },
            { id: 'b', index: 2 },
        ];
        const list = vi.fn(async () => rows);
        const write = vi.fn((indexes: Record<string, number>) => {
            rows = rows.map((row) => ({ ...row, index: indexes[row.id] }));
            return Promise.resolve(undefined);
        });
        expect(await runReorder({ label: 'rule', ids: ['b', 'a'], list, write, dryRun: true })).toMatchObject({ before: { order: ['a', 'b'] } });
        const result = await runReorder({ label: 'rule', ids: ['b', 'a'], list, write, dryRun: false });
        expect(write).toHaveBeenCalledWith({ b: 1, a: 2 });
        expect(result).toMatchObject({ verification: { status: 'verified' } });
    });
});
