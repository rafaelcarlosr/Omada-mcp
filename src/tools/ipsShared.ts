import { type RecordLike, toRecords } from './resourceMutationShared.js';

/** Every row of a paginated controller list, 100 rows per page. */
export async function allPages(fetch: (page: number, pageSize: number) => Promise<unknown>): Promise<RecordLike[]> {
    const rows: RecordLike[] = [];
    for (let page = 1; page <= 100; page++) {
        const result = (await fetch(page, 100)) as { data?: unknown; totalRows?: unknown } | undefined;
        const data = toRecords(result?.data);
        rows.push(...data);
        if (data.length < 100 || rows.length >= Number(result?.totalRows ?? 0)) break;
    }
    return rows;
}

const SOURCE_FIELD: Record<number, string> = { 0: 'ipAddress', 1: 'network', 2: 'subnet' };

/** IPS allow list rows report the exempted target as trafficSource; requests name it by trafficType. */
export function allowEntryRequest(row: RecordLike): RecordLike {
    const field = SOURCE_FIELD[Number(row.trafficType)];
    return {
        id: row.id,
        direction: row.direction,
        trafficType: row.trafficType,
        ...(field && row.trafficSource !== undefined ? { [field]: row.trafficSource } : {}),
    };
}

/** The target field each trafficType needs (0 ipAddress, 1 network, 2 subnet). */
export function checkAllowEntry(entry: RecordLike): void {
    const field = SOURCE_FIELD[Number(entry.trafficType)];
    if (!field) throw new Error('trafficType must be 0 (IP address), 1 (LAN network) or 2 (subnet). No request was sent.');
    if (entry[field] === undefined) throw new Error(`trafficType ${String(entry.trafficType)} needs ${field}. No request was sent.`);
    if (entry.direction === undefined) throw new Error('direction is required (0 both, 1 source, 2 destination). No request was sent.');
}
