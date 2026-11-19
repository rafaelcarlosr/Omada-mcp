import { describe, expect, it } from 'vitest';

import { controllerInputSchema, targetSiteSchema } from '../../src/tools/siteAdminShared.js';

describe('tools/siteAdminShared', () => {
    it('controller-level inputs take no site ID', () => {
        expect(controllerInputSchema.parse({})).toEqual({});
        expect('siteId' in controllerInputSchema.shape).toBe(false);
    });

    it('site administration requires an explicit site ID', () => {
        expect(() => targetSiteSchema.parse({})).toThrow();
        expect(targetSiteSchema.parse({ siteId: 's-1' })).toEqual({ siteId: 's-1' });
    });
});
