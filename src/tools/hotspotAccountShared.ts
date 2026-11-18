import type { RecordLike } from './resourceMutationShared.js';

/** The controller returns hotspot local-user and operator passwords in clear text; never pass them on. */
export const REDACTED = '[redacted]';

export function withoutPassword(record: RecordLike): RecordLike {
    if (!('password' in record)) return record;
    const { password: _password, ...rest } = record;
    return rest;
}

export function redactPasswords(records: unknown[]): unknown[] {
    return records.map((record) =>
        typeof record === 'object' && record !== null && !Array.isArray(record) && 'password' in record ? { ...record, password: REDACTED } : record
    );
}
