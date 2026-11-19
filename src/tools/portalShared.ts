import { PORTAL_CUSTOMIZE_DEFAULTS } from '../omadaClient/portals.js';
import { portalCustomizeOpenApiVOSchema, portalSettingSchema } from '../omadaClient/requestSchemas.js';
import { pickBySchema } from './authProfileShared.js';
import type { RecordLike } from './resourceMutationShared.js';

const isRecord = (value: unknown): value is RecordLike => typeof value === 'object' && value !== null && !Array.isArray(value);

/** portalCustomize with the fields 6.3 requires but omits from reads while they hold their default. */
export function withCustomizeDefaults(customize: unknown): RecordLike {
    const picked = isRecord(customize) ? (pickBySchema(portalCustomizeOpenApiVOSchema, customize) as RecordLike) : {};
    return { ...PORTAL_CUSTOMIZE_DEFAULTS, ...picked };
}

/** A portal as the request shape: the detail read plus the customization read, which the detail omits. */
export function portalRequest(detail: unknown, customization: unknown): RecordLike {
    const base = pickBySchema(portalSettingSchema, isRecord(detail) ? detail : {}) as RecordLike;
    const customize = isRecord(customization) ? customization.portalCustomize : undefined;
    return { ...base, portalCustomize: withCustomizeDefaults(customize) };
}

/** Portal fields the detail read reshapes, omits or never returns (secrets and page customization). */
export const PORTAL_WRITE_ONLY: readonly string[] = [
    'portalCustomize',
    'authTimeout',
    'simplePassword',
    'google',
    'sms',
    'hotspot',
    'socialLogin',
    'noAuth',
];
