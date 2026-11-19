import { describe, expect, it } from 'vitest';

import { apOuiRuleRequest, DNS_PROXY_SETTING } from '../../src/tools/lanShared.js';

describe('tools/lanShared', () => {
    it('maps AP OUI rules to the request shape', () => {
        expect(
            apOuiRuleRequest({
                id: 'r1',
                enable: true,
                name: 'r',
                ssidList: [{ ssidId: 's1', ssidName: 'one' }, 'junk'],
                ruleCombine: [{ vlanId: 20, priority: 3, ouiProfileId: 'o1', ouiProfileName: 'p' }],
            })
        ).toEqual({ id: 'r1', enable: true, name: 'r', ssidIdList: ['s1'], ruleCombine: [{ vlanId: 20, priority: 3, ouiProfileId: 'o1' }] });
        expect(apOuiRuleRequest({ id: 'r2' })).toMatchObject({ ssidIdList: [], ruleCombine: [] });
    });

    it('names the setting of each DNS proxy type', () => {
        expect(DNS_PROXY_SETTING[0]).toBe('dnsSecSetting');
        expect(DNS_PROXY_SETTING[3]).toBe('dnsOverrideSetting');
    });
});
