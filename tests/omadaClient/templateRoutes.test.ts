import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import { SITE_TEMPLATE_ROUTES, SITE_TEMPLATE_TOOLS } from '../../src/omadaClient/templateRoutes.js';

const spec = JSON.parse(readFileSync(new URL('../../docs/openapi/00-all.json', import.meta.url), 'utf8')) as {
    paths: Record<string, Record<string, unknown>>;
};

describe('omadaClient/templateRoutes', () => {
    it('lists only site template routes that the spec defines', () => {
        const defined = new Set(
            Object.entries(spec.paths).flatMap(([path, item]) =>
                Object.keys(item).map((method) => `${method.toUpperCase()} ${path.replace(/\{[^}]+\}/g, '{}')}`)
            )
        );
        const listed = Object.entries(SITE_TEMPLATE_ROUTES).flatMap(([key, routes]) => {
            const [method, version] = key.split(' ');
            return routes.map((route) => `${method} /openapi/${version}/{}${route}`);
        });
        expect(listed.length).toBeGreaterThan(400);
        for (const route of listed) expect(defined.has(route), route).toBe(true);
    });

    it('marks site setting tools as template-capable and leaves device and site tools out', () => {
        expect(SITE_TEMPLATE_TOOLS.has('updateSsid')).toBe(true);
        expect(SITE_TEMPLATE_TOOLS.has('createRateLimitProfile')).toBe(true);
        expect(SITE_TEMPLATE_TOOLS.has('listDevices')).toBe(false);
        expect(SITE_TEMPLATE_TOOLS.has('deleteSite')).toBe(false);
    });
});
