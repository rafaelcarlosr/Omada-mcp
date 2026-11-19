import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import type { OmadaClient } from '../omadaClient/index.js';
import { wrapMutationToolHandler } from '../server/common.js';
import { dryRunSchema, mutationSummary, runBatchDelete } from './resourceMutationShared.js';
import { controllerInputSchema } from './siteAdminShared.js';

const inputSchema = controllerInputSchema.extend({
    siteTemplateId: z.string().trim().min(1).describe('Site template ID from getSiteTemplateList.'),
    siteIds: z.array(z.string().trim().min(1)).min(1).max(300).describe('IDs of bound sites, from listSiteTemplateBoundSites.'),
    dryRun: dryRunSchema,
});

type Client = Pick<OmadaClient, 'listSiteTemplateBoundSites' | 'unbindSitesFromTemplate'>;

export function registerUnbindSitesFromTemplateTool(server: McpServer, client: Client): void {
    server.registerTool(
        'unbindSitesFromTemplate',
        {
            description:
                'Unbind sites from a site template; they keep their current settings and are managed on their own again. The controller applies it after a few seconds. Defaults to a preview; set dryRun:false to unbind and verify.',
            inputSchema: inputSchema.shape,
            annotations: { destructiveHint: true },
        },
        wrapMutationToolHandler<typeof inputSchema.shape>(
            'unbindSitesFromTemplate',
            mutationSummary('unbind-sites-from-template', (args) => (args.siteIds as string[]).join(',')),
            async ({ siteTemplateId, siteIds, customHeaders, dryRun }) =>
                await runBatchDelete({
                    spec: {
                        label: 'bound site',
                        list: async () =>
                            ((await client.listSiteTemplateBoundSites(siteTemplateId, 1, 1000, customHeaders)) as { data?: unknown })?.data ?? [],
                        nameKey: null,
                    },
                    ids: siteIds,
                    dryRun,
                    write: () => client.unbindSitesFromTemplate(siteTemplateId, siteIds, customHeaders),
                    verify: { attempts: 10, delayMs: 1500 },
                })
        )
    );
}
