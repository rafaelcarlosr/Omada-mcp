import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import type { OmadaClient } from '../omadaClient/index.js';
import { wrapMutationToolHandler } from '../server/common.js';
import { dryRunSchema, mutationSummary, runSettings } from './resourceMutationShared.js';
import { controllerInputSchema } from './siteAdminShared.js';

const inputSchema = controllerInputSchema.extend({
    country: z
        .string()
        .trim()
        .regex(/^[A-Z]{2}$/, 'Use an ISO 3166-1 alpha-2 code such as "KP".')
        .describe('Country code, ISO 3166-1 alpha-2.'),
    siteIds: z.array(z.string().trim().min(1)).min(1).max(300).describe('Sites to change, from listSites.'),
    dryRun: dryRunSchema,
});

type Client = Pick<OmadaClient, 'listBlockedCountries' | 'unblockCountry'>;

export function registerUnblockCountryTool(server: McpServer, client: Client): void {
    server.registerTool(
        'unblockCountry',
        {
            description:
                'Stop blocking a country on the given sites. Defaults to a preview of each site; set dryRun:false to apply and verify per site.',
            inputSchema: inputSchema.shape,
            annotations: { destructiveHint: true },
        },
        wrapMutationToolHandler<typeof inputSchema.shape>(
            'unblockCountry',
            mutationSummary('unblock-country', (args) => `${String(args.country)} on ${(args.siteIds as string[]).length} site(s)`),
            async ({ country, siteIds, customHeaders, dryRun }) => {
                const sites = [...new Set(siteIds)];
                return await runSettings({
                    label: 'blocked countries',
                    read: async () => {
                        const state: Record<string, boolean> = {};
                        for (const site of sites) {
                            const result = (await client.listBlockedCountries([site], customHeaders)) as { countries?: unknown } | undefined;
                            state[site] = Array.isArray(result?.countries) && result.countries.includes(country);
                        }
                        return state;
                    },
                    payload: Object.fromEntries(sites.map((site) => [site, false])),
                    dryRun,
                    write: () => client.unblockCountry(country, sites, customHeaders),
                });
            }
        )
    );
}
