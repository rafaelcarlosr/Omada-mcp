import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import type { OmadaClient } from '../omadaClient/index.js';
import { wrapMutationToolHandler } from '../server/common.js';
import { dryRunSchema, findRecord, mutationSummary, runAction, toRecords } from './resourceMutationShared.js';
import { controllerInputSchema } from './siteAdminShared.js';

const inputSchema = controllerInputSchema.extend({
    siteTemplateId: z.string().trim().min(1).describe('Site template ID from getSiteTemplateList.'),
    siteIds: z.array(z.string().trim().min(1)).min(1).max(300).describe('IDs of bound sites, from listSiteTemplateBoundSites.'),
    dryRun: dryRunSchema,
});

type Client = Pick<OmadaClient, 'listSiteTemplateBoundSites' | 'syncSitesWithTemplate'>;

export function registerSyncSitesWithTemplateTool(server: McpServer, client: Client): void {
    server.registerTool(
        'syncSitesWithTemplate',
        {
            description:
                'Re-apply the site template to bound sites, discarding their overrides. Only bound sites are accepted. Defaults to a preview with each site and its overrides; set dryRun:false to sync.',
            inputSchema: inputSchema.shape,
            annotations: { destructiveHint: true },
        },
        wrapMutationToolHandler<typeof inputSchema.shape>(
            'syncSitesWithTemplate',
            mutationSummary('sync-sites-with-template', (args) => (args.siteIds as string[]).join(',')),
            async ({ siteTemplateId, siteIds, customHeaders, dryRun }) =>
                await runAction({
                    label: 'template sync',
                    dryRun,
                    preflight: async () => {
                        const bound = toRecords(
                            await (async () =>
                                ((await client.listSiteTemplateBoundSites(siteTemplateId, 1, 1000, customHeaders)) as { data?: unknown })?.data ??
                                [])()
                        );
                        const missing = siteIds.filter((id) => !findRecord(bound, id));
                        if (missing.length) throw new Error(`Site(s) ${missing.join(', ')} are not bound to this template. No request was sent.`);
                        return { sites: siteIds.map((id) => findRecord(bound, id)) };
                    },
                    write: () => client.syncSitesWithTemplate(siteTemplateId, siteIds, customHeaders),
                    warnings: ['Site overrides of the template settings are discarded and the template settings are pushed to the devices again.'],
                })
        )
    );
}
