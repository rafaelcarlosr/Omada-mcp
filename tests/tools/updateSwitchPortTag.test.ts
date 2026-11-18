import { describe, expect, it, vi } from 'vitest';

import { registerUpdateSwitchPortTagTool } from '../../src/tools/updateSwitchPortTag.js';
import { toolHarness } from '../helpers/toolHarness.js';

function client() {
    let tags: Record<string, unknown>[] = [
        { tagId: 't-1', name: 'uplinks', resource: 0 },
        { tagId: 't-2', name: 'cams', resource: 0 },
    ];
    return {
        listSwitchPortTags: vi.fn(async () => tags),
        updateSwitchPortTag: vi.fn((body: Record<string, unknown>) => {
            tags = tags.map((tag) => (tag.tagId === body.tagId ? { ...tag, ...body } : tag));
            return Promise.resolve({});
        }),
    };
}

describe('tools/updateSwitchPortTag', () => {
    it('previews, then renames with the tagId in the body and verifies', async () => {
        const fake = client();
        const harness = toolHarness(registerUpdateSwitchPortTagTool, fake);
        await expect(harness.invoke({ tagId: 't-1', payload: { name: 'core' } })).resolves.toMatchObject({ status: 'planned' });
        await expect(harness.invoke({ tagId: 't-1', payload: { name: 'core' }, dryRun: false })).resolves.toMatchObject({ status: 'verified' });
        expect(fake.updateSwitchPortTag).toHaveBeenCalledWith({ tagId: 't-1', name: 'core' }, undefined, undefined);
    });

    it('refuses unknown ids and names used by another label', async () => {
        const harness = toolHarness(registerUpdateSwitchPortTagTool, client());
        await expect(harness.invoke({ tagId: 'missing', payload: { name: 'x' }, dryRun: false })).rejects.toThrow('No switch port label');
        await expect(harness.invoke({ tagId: 't-1', payload: { name: 'cams' }, dryRun: false })).rejects.toThrow('already exists');
    });
});
