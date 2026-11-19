import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import type { OmadaClient } from '../omadaClient/index.js';
import { wrapMutationToolHandler } from '../server/common.js';
import { dryRunSchema, mutationSummary, runDelete } from './resourceMutationShared.js';
import { controllerInputSchema } from './siteAdminShared.js';

const inputSchema = controllerInputSchema.extend({
    siteTemplateId: z.string().trim().min(1).describe('Site template ID from getSiteTemplateList.'),
    dryRun: dryRunSchema,
});

type Client = Pick<OmadaClient, 'deleteSiteTemplate' | 'getSiteTemplateList'>;

export function registerDeleteSiteTemplateTool(server: McpServer, client: Client): void {
    server.registerTool(
        'deleteSiteTemplate',
        {
            description:
                'Delete a site template. Refused while sites are bound to it (unbind them first). Defaults to a preview; set dryRun:false to delete and verify it is gone.',
            inputSchema: inputSchema.shape,
            annotations: { destructiveHint: true },
        },
        wrapMutationToolHandler<typeof inputSchema.shape>(
            'deleteSiteTemplate',
            mutationSummary('delete-site-template', (args) => String(args.siteTemplateId)),
            async ({ siteTemplateId, customHeaders, dryRun }) =>
                await runDelete({
                    spec: {
                        label: 'site template',
                        list: async () => ((await client.getSiteTemplateList(1, 1000, customHeaders)) as { data?: unknown })?.data ?? [],
                    },
                    id: siteTemplateId,
                    dryRun,
                    guard: (template) => {
                        if (Number(template.bindSiteNum ?? 0) > 0) {
                            throw new Error(
                                `"${String(template.name)}" is bound to ${String(template.bindSiteNum)} site(s); unbind them first. No request was sent.`
                            );
                        }
                    },
                    write: () => client.deleteSiteTemplate(siteTemplateId, customHeaders),
                })
        )
    );
}
