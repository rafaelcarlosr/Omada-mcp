import { describe, expect, it } from 'vitest';

import { PORTAL_WRITE_ONLY, portalRequest, withCustomizeDefaults } from '../../src/tools/portalShared.js';

describe('tools/portalShared', () => {
    it('fills the customization switches the read omits', () => {
        expect(withCustomizeDefaults({ logoDisplay: true, background: 2, buttonColor: '#00A870' })).toEqual({
            defaultLanguage: 0,
            copyrightEnable: false,
            logoDisplay: true,
            termsOfServiceEnable: false,
            welcomeEnable: false,
            buttonColor: '#00A870',
        });
        expect(withCustomizeDefaults(undefined)).toMatchObject({ defaultLanguage: 0 });
    });

    it('builds the request from the detail and customization reads', () => {
        const request = portalRequest({ id: 'p1', name: 'p', enable: true, extra: 1 }, { pageType: 1, portalCustomize: { welcomeEnable: true } });
        expect(request).toEqual({
            name: 'p',
            enable: true,
            portalCustomize: { defaultLanguage: 0, copyrightEnable: false, logoDisplay: false, termsOfServiceEnable: false, welcomeEnable: true },
        });
        expect(portalRequest(null, null)).toMatchObject({ portalCustomize: { defaultLanguage: 0 } });
        expect(PORTAL_WRITE_ONLY).toContain('simplePassword');
    });
});
