import { describe, expect, it, vi } from 'vitest';

import { OmadaApiError } from '../../src/omadaClient/request.js';
import { registerCreateSwitchPortTagTool } from '../../src/tools/createSwitchPortTag.js';
import { toolHarness } from '../helpers/toolHarness.js';

function client(rows: Record<string, unknown>[] = [{ tagId: 't-1', name: 'uplinks', resource: 0 }]) {
    let tags = rows;
    return {
        listSwitchPortTags: vi.fn(async () => tags),
        createSwitchPortTag: vi.fn((body: Record<string, unknown>) => {
            tags = [...tags, { ...body, tagId: 'new-1', resource: 0 }];
            return Promise.resolve({ tagId: 'new-1' });
        }),
    };
}

describe('tools/createSwitchPortTag', () => {
    it('validates the label name', () => {
        const schema = toolHarness(registerCreateSwitchPortTagTool, client()).schema();
        expect(() => schema.parse({ payload: { name: ' padded' } })).toThrow();
        expect(() => schema.parse({ payload: { name: 'cams', extra: 1 } })).toThrow();
    });

    it('previews, then creates once and verifies the readback', async () => {
        const fake = client();
        const harness = toolHarness(registerCreateSwitchPortTagTool, fake);
        await expect(harness.invoke({ payload: { name: 'cams' } })).resolves.toMatchObject({ status: 'planned' });
        expect(fake.createSwitchPortTag).not.toHaveBeenCalled();
        await expect(harness.invoke({ payload: { name: 'cams' }, siteId: 's1', dryRun: false })).resolves.toMatchObject({
            status: 'verified',
            result: { createdId: 'new-1' },
        });
        expect(fake.createSwitchPortTag).toHaveBeenCalledWith({ name: 'cams' }, 's1', undefined);
    });

    it('refuses duplicate names and surfaces rejections', async () => {
        const fake = client();
        const harness = toolHarness(registerCreateSwitchPortTagTool, fake);
        await expect(harness.invoke({ payload: { name: 'uplinks' }, dryRun: false })).rejects.toThrow('already exists');
        fake.createSwitchPortTag.mockRejectedValueOnce(new OmadaApiError(-1001, 'rejected'));
        await expect(harness.invoke({ payload: { name: 'cams' }, dryRun: false })).rejects.toThrow('(errorCode -1001): rejected');
    });
});
