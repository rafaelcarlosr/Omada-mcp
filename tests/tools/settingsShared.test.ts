import { describe, expect, it, vi } from 'vitest';
import { z } from 'zod';

import { runMergedSettings } from '../../src/tools/settingsShared.js';

const schema = z.object({ enable: z.boolean(), port: z.number().optional() }).strict();

describe('tools/settingsShared', () => {
    it('merges changes over the current values the schema accepts and verifies', async () => {
        let state: Record<string, unknown> = { enable: false, port: 514, resource: 0 };
        const write = vi.fn((payload: Record<string, unknown>) => {
            state = { ...state, ...payload };
            return Promise.resolve(undefined);
        });
        const result = await runMergedSettings({
            label: 'x',
            schema,
            read: async () => state,
            changes: { enable: true },
            dryRun: false,
            write,
            warnings: (payload) => (payload.enable ? ['on'] : []),
        });
        expect(write).toHaveBeenCalledWith({ enable: true, port: 514 });
        expect(result).toMatchObject({ verification: { status: 'verified' }, warnings: ['on'] });
    });

    it('checks the payload, verifies a view and tolerates an empty read', async () => {
        await expect(
            runMergedSettings({
                label: 'x',
                schema,
                read: async () => undefined,
                changes: { enable: true },
                dryRun: false,
                write: vi.fn(),
                check: () => {
                    throw new Error('refused');
                },
            })
        ).rejects.toThrow('refused');
        const preview = await runMergedSettings({
            label: 'x',
            schema,
            read: async () => ({ enable: true, port: 1 }),
            changes: { enable: false },
            dryRun: true,
            write: vi.fn(),
            verifyView: () => ({ enable: false }),
            writeOnly: ['port'],
        });
        expect(preview).toMatchObject({ planned: { enable: false } });
    });
});
