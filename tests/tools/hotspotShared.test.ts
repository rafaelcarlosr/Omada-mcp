import { describe, expect, it } from 'vitest';

import { surveyRecord } from '../../src/tools/hotspotShared.js';

describe('tools/hotspotShared', () => {
    it('maps isPublished to published and leaves other records alone', () => {
        expect(surveyRecord({ id: 's', isPublished: true })).toEqual({ id: 's', published: true });
        expect(surveyRecord({ id: 's' })).toEqual({ id: 's' });
    });
});
