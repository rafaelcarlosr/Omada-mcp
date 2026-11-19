import { AsyncLocalStorage } from 'node:async_hooks';

import { SITE_TEMPLATE_ROUTES } from './templateRoutes.js';

/**
 * Site template targeting. A site tool whose every route has a site template mirror in the official spec
 * (SITE_TEMPLATE_TOOLS in templateRoutes.ts) also accepts siteTemplateId. The tool then receives a marker as
 * its siteId, the client rewrites /sites/<marker>/... to /sitetemplates/<id>/..., and while the call runs every
 * request must be a spec-defined route of that template; anything else is refused before it is sent.
 */
const MARKER = 'sitetemplate:';

/** Raised before anything is sent, so callers can tell a refused request from a lost one. */
export class RequestNotSentError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'RequestNotSentError';
    }
}

const scope = new AsyncLocalStorage<string>();

export function siteTemplateTarget(siteTemplateId: string): string {
    const id = siteTemplateId.trim();
    if (!id || /[/?#]/.test(id)) throw new RequestNotSentError('siteTemplateId must be a non-empty template ID. No request was sent.');
    return `${MARKER}${id}`;
}

/** Runs a site tool against a site template: siteId becomes the template target and requests are confined to it. */
export async function runInSiteTemplateScope<T>(siteTemplateId: string, run: (siteId: string) => Promise<T>): Promise<T> {
    const target = siteTemplateTarget(siteTemplateId);
    return await scope.run(target.slice(MARKER.length), () => run(target));
}

const SCOPED = /^\/sites\/sitetemplate(?:%3A|:)([^/?]+)(.*)$/i;

/** Rewrites /sites/<marker>/... to /sitetemplates/<id>/...; any other use of the marker is refused. */
export function scopeTemplatePath(relativePath: string): string {
    const match = SCOPED.exec(relativePath);
    if (match) return `/sitetemplates/${encodeURIComponent(decodeURIComponent(match[1]))}${match[2]}`;
    if (/sitetemplate(?:%3A|:)/i.test(relativePath)) {
        throw new RequestNotSentError('This operation is not available for site templates. No request was sent.');
    }
    return relativePath;
}

function isSpecRoute(method: string, version: string, path: string): boolean {
    const segments = path.split('/').filter(Boolean);
    return (SITE_TEMPLATE_ROUTES[`${method} ${version}`] ?? []).some((route) => {
        const parts = route.split('/').filter(Boolean);
        return parts.length === segments.length && parts.every((part, index) => part === '{}' || part === segments[index]);
    });
}

/**
 * Checked for every request before it is sent. /sitetemplates routes must exist in the spec for that method;
 * inside a site template scope, every request must target that template and carry no site marker in its data.
 */
export function assertSiteTemplateRequest(method: string, url: string, data?: unknown, params?: unknown): void {
    const verb = method.toUpperCase();
    const path = url.split('?')[0];
    const match = /^\/openapi\/(v\d)\/[^/]+(\/sitetemplates(?:\/.*)?)$/.exec(path);
    const active = scope.getStore();
    if (active !== undefined) {
        const prefix = `/sitetemplates/${encodeURIComponent(active)}/`;
        if (!match || !`${match[2]}/`.startsWith(prefix)) {
            throw new RequestNotSentError(`This tool needs a ${verb} request that site templates do not support. No request was sent.`);
        }
        if (/sitetemplate:/i.test(JSON.stringify([data ?? null, params ?? null]))) {
            throw new RequestNotSentError(
                'This tool sends the site ID in its request body, which site templates do not support. No request was sent.'
            );
        }
    }
    if (match && !isSpecRoute(verb, match[1], match[2])) {
        throw new RequestNotSentError(
            `Site templates do not support ${verb} ${match[2].replace(/^(\/sitetemplates)\/[^/]+/, '$1/{siteTemplateId}')}. No request was sent.`
        );
    }
}
