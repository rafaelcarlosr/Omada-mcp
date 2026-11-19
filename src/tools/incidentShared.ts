import type { OmadaClient } from '../omadaClient/index.js';
import type { CustomHeaders } from '../types/index.js';
import { type RecordLike, toRecords } from './resourceMutationShared.js';

/** The incident list accepts at most 100 rows per page. */
const PAGE_SIZE = 100;
const MAX_PAGES = 50;

/** Every incident of the period, page by page. */
export async function allIncidents(
    client: Pick<OmadaClient, 'listAnomalyIncidents'>,
    range: { startTime: number; endTime: number },
    siteId?: string,
    customHeaders?: CustomHeaders
): Promise<RecordLike[]> {
    const incidents: RecordLike[] = [];
    for (let page = 1; page <= MAX_PAGES; page++) {
        const rows = toRecords(
            ((await client.listAnomalyIncidents(range, page, PAGE_SIZE, {}, siteId, customHeaders)) as { data?: unknown })?.data ?? []
        );
        incidents.push(...rows);
        if (rows.length < PAGE_SIZE) break;
    }
    return incidents;
}
