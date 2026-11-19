import type { z } from 'zod';

import { pickBySchema } from './authProfileShared.js';
import { type RecordLike, runSettings } from './resourceMutationShared.js';

const isRecord = (value: unknown): value is RecordLike => typeof value === 'object' && value !== null && !Array.isArray(value);

/**
 * Settings whose write needs the complete object: the current values the schema accepts are overlaid with the
 * requested changes, validated, optionally checked, sent, and verified by readback.
 */
export async function runMergedSettings<S extends z.AnyZodObject>(input: {
    label: string;
    schema: S;
    read: () => Promise<unknown>;
    changes: RecordLike;
    dryRun: boolean;
    write: (payload: z.output<S>) => Promise<unknown>;
    check?: (payload: z.output<S>) => void;
    /** The part of the payload the controller reads back (e.g. only the switch while a feature is off). */
    verifyView?: (payload: z.output<S>) => RecordLike;
    writeOnly?: readonly string[];
    warnings?: (payload: z.output<S>) => string[];
}): Promise<RecordLike> {
    const read = async (): Promise<RecordLike> => {
        const value = await input.read();
        return isRecord(value) ? value : {};
    };
    const payload = input.schema.parse(pickBySchema(input.schema, { ...(await read()), ...input.changes })) as z.output<S>;
    input.check?.(payload);
    return await runSettings({
        label: input.label,
        read,
        payload: input.verifyView ? input.verifyView(payload) : (payload as RecordLike),
        dryRun: input.dryRun,
        write: () => input.write(payload),
        ...(input.writeOnly ? { writeOnly: input.writeOnly } : {}),
        ...(input.warnings ? { warnings: input.warnings(payload) } : {}),
    });
}
