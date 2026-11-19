import { z } from 'zod';

/** Optional dashboard period; the client fills the last hour when it is omitted. */
export const dashboardWindowShape = {
    start: z.number().int().nonnegative().optional().describe('Start of the period, epoch seconds. Defaults to one hour before end.'),
    end: z.number().int().nonnegative().optional().describe('End of the period, epoch seconds. Defaults to now.'),
};
