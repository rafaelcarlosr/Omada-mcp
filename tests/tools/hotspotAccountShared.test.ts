import { describe, expect, it } from 'vitest';

import { REDACTED, redactPasswords, withoutPassword } from '../../src/tools/hotspotAccountShared.js';

describe('tools/hotspotAccountShared', () => {
    it('drops the password from verification views', () => {
        expect(withoutPassword({ id: 'a', password: 'x', name: 'n' })).toEqual({ id: 'a', name: 'n' });
        const record = { id: 'b' };
        expect(withoutPassword(record)).toBe(record);
    });

    it('redacts passwords in read results and leaves other entries alone', () => {
        expect(redactPasswords([{ id: 'a', password: 'x' }, { id: 'b' }, null, 'text'])).toEqual([
            { id: 'a', password: REDACTED },
            { id: 'b' },
            null,
            'text',
        ]);
    });
});
