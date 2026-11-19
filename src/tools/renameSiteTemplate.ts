import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import type { OmadaClient } from '../omadaClient/index.js';
import { wrapMutationToolHandler } from '../server/common.js';
import { dryRunSchema, mutationSummary, runUpdate } from './resourceMutationShared.js';
import { controllerInputSchema } from './siteAdminShared.js';

const inputSchema = controllerInputSchema.extend({
    siteTemplateId: z.string().trim().min(1).describe('Site template ID from getSiteTemplateList.'),
    name: z.string().min(1).max(64).describe('New template name.'),
    dryRun: dryRunSchema,
});

type Client = Pick<OmadaClient, 'getSiteTemplateList' | 'renameSiteTemplate'>;

export function registerRenameSiteTemplateTool(server: McpServer, client: Client): void {
    server.registerTool(
        'renameSiteTemplate',
        {
            description: 'Rename a site template. Defaults to a preview; set dryRun:false to apply once and verify by readback.',
            inputSchema: inputSchema.shape,
            annotations: { destructiveHint: true },
        },
        wrapMutationToolHandler<typeof inputSchema.shape>(
            'renameSiteTemplate',
            mutationSummary('rename-site-template', (args) => String(args.siteTemplateId)),
            async ({ siteTemplateId, name, customHeaders, dryRun }) =>
                await runUpdate({
                    spec: {
                        label: 'site template',
                        list: async () => ((await client.getSiteTemplateList(1, 1000, customHeaders)) as { data?: unknown })?.data ?? [],
                    },
                    id: siteTemplateId,
                    payload: { name },
                    dryRun,
                    write: () => client.renameSiteTemplate(siteTemplateId, name, customHeaders),
                })
        )
    );
}
