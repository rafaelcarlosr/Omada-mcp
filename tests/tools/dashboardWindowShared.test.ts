import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import { dashboardWindowShape } from '../../src/tools/dashboardWindowShared.js';

describe('tools/dashboardWindowShared', () => {
    const schema = z.object(dashboardWindowShape).strict();

    it('leaves the period optional so the client can default to the last hour', () => {
        expect(schema.parse({})).toEqual({});
    });

    it('accepts whole epoch seconds and rejects negative or fractional values', () => {
        expect(schema.parse({ start: 1_700_000_000, end: 1_700_003_600 })).toEqual({ start: 1_700_000_000, end: 1_700_003_600 });
        expect(schema.safeParse({ start: -1 }).success).toBe(false);
        expect(schema.safeParse({ end: 1.5 }).success).toBe(false);
    });
});
