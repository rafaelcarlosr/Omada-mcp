import { describe, expect, it } from 'vitest';

import { checkSslVpnLock, sortedIds, vpnUserPayloadSchema, withSortedIds } from '../../src/tools/vpnShared.js';

describe('tools/vpnShared', () => {
    it('sorts ids from strings or id objects', () => {
        expect(sortedIds(['b', { id: 'a', name: 'A' }, 3])).toEqual(['a', 'b']);
        expect(sortedIds(undefined)).toBeUndefined();
    });

    it('sorts the id list of a record when present', () => {
        expect(withSortedIds({ name: 'g', resourcesList: ['z', 'y'] }, 'resourcesList')).toEqual({ name: 'g', resourcesList: ['y', 'z'] });
        const record = { name: 'g' };
        expect(withSortedIds(record, 'resourcesList')).toBe(record);
    });

    it('requires username, password and protocol for VPN users', () => {
        expect(() => vpnUserPayloadSchema.parse({ username: 'a', protocol: 0 })).toThrow();
        expect(() => vpnUserPayloadSchema.parse({ username: 'a', password: 'p', protocol: 3 })).toThrow();
        expect(() => vpnUserPayloadSchema.parse({ username: 'a', password: 'p', protocol: 0, extra: 1 })).toThrow();
        expect(vpnUserPayloadSchema.parse({ username: 'a', password: 'p', protocol: 2, groupId: 'g' })).toEqual({
            username: 'a',
            password: 'p',
            protocol: 2,
            groupId: 'g',
        });
    });

    it('checks the target of a locked SSL VPN tunnel', () => {
        expect(() => checkSslVpnLock({ type: 0, username: 'u' })).not.toThrow();
        expect(() => checkSslVpnLock({ type: 1, ip: '10.0.0.1' })).not.toThrow();
        expect(() => checkSslVpnLock({ type: 0 })).toThrow('needs username');
        expect(() => checkSslVpnLock({ type: 1 })).toThrow('needs ip');
        expect(() => checkSslVpnLock({ type: 2 })).toThrow('type must be 0');
    });
});
