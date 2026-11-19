import { z } from 'zod';

import type { OmadaClient } from '../omadaClient/index.js';
import { createRadiusUserOpenApiVOSchema } from '../omadaClient/requestSchemas.js';
import type { CustomHeaders } from '../types/index.js';
import { type RecordLike, toRecords } from './resourceMutationShared.js';

const isRecord = (value: unknown): value is RecordLike => typeof value === 'object' && value !== null && !Array.isArray(value);

/** Keeps only the fields a request schema accepts, recursively; read-only fields of a record are dropped. */
export function pickBySchema(schema: z.ZodTypeAny, value: unknown): unknown {
    if (schema instanceof z.ZodOptional || schema instanceof z.ZodNullable || schema instanceof z.ZodDefault) {
        return pickBySchema(schema._def.innerType, value);
    }
    if (schema instanceof z.ZodEffects) return pickBySchema(schema._def.schema, value);
    if (schema instanceof z.ZodArray) return Array.isArray(value) ? value.map((item) => pickBySchema(schema.element, item)) : value;
    if (schema instanceof z.ZodObject && isRecord(value)) {
        const shape = schema.shape as z.ZodRawShape;
        return Object.fromEntries(
            Object.entries(value)
                .filter(([key, item]) => Object.hasOwn(shape, key) && item !== null && item !== undefined)
                .map(([key, item]) => [key, pickBySchema(shape[key], item)])
        );
    }
    return value;
}

/** New server entries without a password keep the password of the current entry with the same address. */
export function withServerSecrets(servers: unknown, current: unknown, addressKey: string, secretKey: string): unknown {
    if (!Array.isArray(servers)) return servers;
    const known = Array.isArray(current) ? current.filter(isRecord) : [];
    return servers.map((server) => {
        if (!isRecord(server) || server[secretKey] !== undefined) return server;
        const match = known.find((entry) => entry[addressKey] === server[addressKey]);
        return match?.[secretKey] === undefined ? server : { ...server, [secretKey]: match[secretKey] };
    });
}

/**
 * Built-in RADIUS users as the request shape. The read flattens userInfo, reports unset limits as 0 and gives
 * MAC-auth users (type 1) their MAC as username.
 */
export function radiusUserRequest(record: RecordLike): RecordLike {
    const limits = ['upRateLimit', 'downRateLimit', 'upLimit', 'downLimit', 'timeout'];
    const flat = Object.fromEntries(Object.entries(record).filter(([key, value]) => !(limits.includes(key) && value === 0)));
    const identity =
        record.type === 1
            ? { macAddress: record.macAddress ?? record.username }
            : { userInfo: { username: record.username, password: record.password } };
    return pickBySchema(createRadiusUserOpenApiVOSchema, { ...flat, ...identity }) as RecordLike;
}

/** Read records in the request shape, keeping the user ID for lookups. */
export function radiusUserRecord(record: RecordLike): RecordLike {
    return { userId: record.userId, ...radiusUserRequest(record) };
}

/** Every built-in RADIUS user of a site (the list route is paginated). */
export async function allRadiusUsers(
    client: Pick<OmadaClient, 'getRadiusUserList'>,
    siteId: string | undefined,
    customHeaders: CustomHeaders | undefined
): Promise<RecordLike[]> {
    const users: RecordLike[] = [];
    for (let page = 1; page <= 100; page++) {
        const result = (await client.getRadiusUserList(page, 100, undefined, siteId, customHeaders)) as { data?: unknown; totalRows?: unknown };
        const rows = toRecords(result?.data);
        users.push(...rows);
        if (rows.length < 100 || users.length >= Number(result?.totalRows ?? 0)) break;
    }
    return users;
}

/** Refuses the built-in RADIUS profile, which the controller manages. */
export function refuseBuiltInRadiusProfile(profile: RecordLike): void {
    if (profile.builtInServer === true) {
        throw new Error(`"${String(profile.name)}" is the built-in RADIUS profile, managed by the controller. No request was sent.`);
    }
}

/** Fields the controller requires once a RADIUS profile option is on (errorCode -1001), checked before sending. */
export function checkRadiusProfile(profile: RecordLike): void {
    const needs: [boolean, string[]][] = [
        [profile.radiusAccountingEnable === true, ['interimUpdateEnable', 'acctServer']],
        [profile.interimUpdateEnable === true, ['interimUpdateInterval']],
        [profile.coaEnable === true, ['coaPassword']],
    ];
    const missing = needs.flatMap(([on, fields]) => (on ? fields.filter((field) => profile[field] === undefined) : []));
    if (missing.length) throw new Error(`The RADIUS profile also needs ${missing.join(', ')}. No request was sent.`);
}
