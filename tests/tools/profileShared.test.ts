import { describe, expect, it } from 'vitest';

import { refuseBuiltInProfile, wifiCallingProfiles } from '../../src/tools/profileShared.js';

describe('tools/profileShared', () => {
    it('refuses default and built-in profiles only', () => {
        const guard = refuseBuiltInProfile('service type');
        expect(() => guard({ name: 'FTP', defaultProfile: true })).toThrow('"FTP" is a built-in service type');
        expect(() => guard({ buildIn: true })).toThrow('"this profile" is a built-in service type');
        expect(() => guard({ name: 'mine', defaultProfile: false, buildIn: false })).not.toThrow();
    });

    it('unwraps the Wi-Fi calling list', () => {
        expect(wifiCallingProfiles({ profileList: [{ id: 'a' }] })).toEqual([{ id: 'a' }]);
        expect(() => wifiCallingProfiles({})).toThrow('unexpected Wi-Fi calling profile list');
        expect(() => wifiCallingProfiles(undefined)).toThrow('unexpected Wi-Fi calling profile list');
    });
});
