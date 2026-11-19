import { type RecordLike, runSettings } from './resourceMutationShared.js';

/** IDs ordered by their 1-based index field. */
export function orderOf(rows: RecordLike[]): string[] {
    return [...rows].sort((a, b) => Number(a.index) - Number(b.index)).map((row) => String(row.id));
}

/**
 * Reorders a complete collection. Controller 6.3 rejects partial index maps (-1001), so the caller lists every
 * ID once, in the new order; the preview shows the current order and verification reads it back.
 */
export async function runReorder(input: {
    label: string;
    ids: string[];
    list: () => Promise<RecordLike[]>;
    write: (indexes: Record<string, number>) => Promise<unknown>;
    dryRun: boolean;
}): Promise<RecordLike> {
    const known = (await input.list()).map((row) => String(row.id));
    const duplicates = input.ids.filter((id, index) => input.ids.indexOf(id) !== index);
    const unknown = input.ids.filter((id) => !known.includes(id));
    const missing = known.filter((id) => !input.ids.includes(id));
    if (duplicates.length || unknown.length || missing.length) {
        const details = [
            duplicates.length ? `repeated: ${duplicates.join(', ')}` : '',
            unknown.length ? `unknown: ${unknown.join(', ')}` : '',
            missing.length ? `missing: ${missing.join(', ')}` : '',
        ].filter(Boolean);
        throw new Error(`List every ${input.label} exactly once in the new order (${details.join('; ')}). No request was sent.`);
    }
    return await runSettings({
        label: `${input.label} order`,
        read: async () => ({ order: orderOf(await input.list()) }),
        payload: { order: input.ids },
        dryRun: input.dryRun,
        write: () => input.write(Object.fromEntries(input.ids.map((id, index) => [id, index + 1]))),
        warnings: ['Rules are evaluated in this order; the first match decides.'],
    });
}
