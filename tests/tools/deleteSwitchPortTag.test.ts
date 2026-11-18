import { describe, expect, it, vi } from 'vitest';

import { registerDeleteSwitchPortTagTool } from '../../src/tools/deleteSwitchPortTag.js';
import { toolHarness } from '../helpers/toolHarness.js';

describe('tools/deleteSwitchPortTag', () => {
    it('previews the label, then deletes once and verifies it is gone', async () => {
        let tags: Record<string, unknown>[] = [{ tagId: 't-1', name: 'uplinks' }];
        const fake = {
            listSwitchPortTags: vi.fn(async () => tags),
            deleteSwitchPortTag: vi.fn((id: string) => {
                tags = tags.filter((tag) => tag.tagId !== id);
                return Promise.resolve({});
            }),
        };
        const harness = toolHarness(registerDeleteSwitchPortTagTool, fake);
        await expect(harness.invoke({ tagId: 't-1' })).resolves.toMatchObject({ status: 'planned', result: { before: { name: 'uplinks' } } });
        await expect(harness.invoke({ tagId: 't-1', dryRun: false })).resolves.toMatchObject({ status: 'verified' });
        expect(fake.deleteSwitchPortTag).toHaveBeenCalledWith('t-1', undefined, undefined);
        await expect(harness.invoke({ tagId: 't-1', dryRun: false })).rejects.toThrow('No switch port label');
    });
});
