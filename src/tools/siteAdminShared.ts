import { z } from 'zod';

import { siteInputSchema } from '../server/common.js';

/** Controller-level tools take no site; they keep only the custom headers of the site input. */
export const controllerInputSchema = siteInputSchema.pick({ customHeaders: true });

/** Site administration targets a site explicitly; it never falls back to the configured default site. */
export const targetSiteSchema = siteInputSchema.extend({
    siteId: z.string().trim().min(1).describe('ID of the site to change, from listSites. Required; the default site is not assumed.'),
});
