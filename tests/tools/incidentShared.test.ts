import { describe, expect, it, vi } from 'vitest';

import { allIncidents } from '../../src/tools/incidentShared.js';

describe('tools/incidentShared', () => {
    it('reads page by page until a short page', async () => {
        const full = Array.from({ length: 100 }, (_, index) => ({ id: `i-${index}` }));
        const client = {
            listAnomalyIncidents: vi
                .fn()
                .mockResolvedValueOnce({ data: full })
                .mockResolvedValueOnce({ data: [{ id: 'last' }] }),
        };
        const incidents = await allIncidents(client as never, { startTime: 1, endTime: 2 }, 's-1');
        expect(incidents).toHaveLength(101);
        expect(client.listAnomalyIncidents).toHaveBeenNthCalledWith(2, { startTime: 1, endTime: 2 }, 2, 100, {}, 's-1', undefined);
    });

    it('treats a missing page as empty', async () => {
        const client = { listAnomalyIncidents: vi.fn().mockResolvedValue(undefined) };
        await expect(allIncidents(client as never, { startTime: 1, endTime: 2 })).resolves.toEqual([]);
    });
});
