import { describe, expect, it } from 'vitest';

import {
    assertSiteTemplateRequest,
    RequestNotSentError,
    runInSiteTemplateScope,
    scopeTemplatePath,
    siteTemplateTarget,
} from '../../src/omadaClient/templateScope.js';

describe('omadaClient/templateScope', () => {
    it('builds a template target and refuses empty or path-like IDs', () => {
        expect(siteTemplateTarget(' t1 ')).toBe('sitetemplate:t1');
        expect(() => siteTemplateTarget(' ')).toThrow(RequestNotSentError);
        expect(() => siteTemplateTarget('t1/../x')).toThrow('No request was sent.');
    });

    it('rewrites site paths for a template target and refuses other uses of the marker', () => {
        expect(scopeTemplatePath('/sites/sitetemplate%3At1/setting/ssids')).toBe('/sitetemplates/t1/setting/ssids');
        expect(scopeTemplatePath('/sites/sitetemplate:t1')).toBe('/sitetemplates/t1');
        expect(scopeTemplatePath('/sites/s1/setting')).toBe('/sites/s1/setting');
        expect(() => scopeTemplatePath('/sites/s1/clients/sitetemplate%3At1')).toThrow('not available for site templates');
    });

    it('allows spec template routes and refuses the rest', () => {
        expect(() => assertSiteTemplateRequest('get', '/openapi/v1/cid/sitetemplates/t1/specification')).not.toThrow();
        expect(() => assertSiteTemplateRequest('GET', '/openapi/v1/cid/sitetemplates?page=1')).not.toThrow();
        expect(() => assertSiteTemplateRequest('GET', '/openapi/v1/cid/sites/s1/devices')).not.toThrow();
        expect(() => assertSiteTemplateRequest('PATCH', '/openapi/v1/cid/sitetemplates/t1/specification')).toThrow(
            'Site templates do not support PATCH /sitetemplates/{siteTemplateId}/specification.'
        );
        expect(() => assertSiteTemplateRequest('GET', '/openapi/v9/cid/sitetemplates/t1/specification')).toThrow(RequestNotSentError);
    });

    it('confines requests inside a template scope to that template', async () => {
        await runInSiteTemplateScope('t1', (siteId) => {
            expect(siteId).toBe('sitetemplate:t1');
            expect(() => assertSiteTemplateRequest('GET', '/openapi/v1/cid/sitetemplates/t1/specification')).not.toThrow();
            expect(() => assertSiteTemplateRequest('GET', '/openapi/v1/cid/sitetemplates/t2/specification')).toThrow('site templates do not support');
            expect(() => assertSiteTemplateRequest('GET', '/openapi/v1/cid/sites')).toThrow(RequestNotSentError);
            expect(() => assertSiteTemplateRequest('POST', '/openapi/v1/cid/sitetemplates/t1/setting/ssids', { siteId: 'sitetemplate:t1' })).toThrow(
                'request body'
            );
            expect(() =>
                assertSiteTemplateRequest('GET', '/openapi/v1/cid/sitetemplates/t1/specification', undefined, { q: 'SiteTemplate:t1' })
            ).toThrow('request body');
            return Promise.resolve();
        });
        expect(() => assertSiteTemplateRequest('GET', '/openapi/v1/cid/sites')).not.toThrow();
        await expect(runInSiteTemplateScope('', () => Promise.resolve(1))).rejects.toThrow(RequestNotSentError);
    });
});
