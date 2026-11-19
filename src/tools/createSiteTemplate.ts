import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import type { OmadaClient } from '../omadaClient/index.js';
import { siteTemplateCreateSchema } from '../omadaClient/siteTemplates.js';
import { wrapMutationToolHandler } from '../server/common.js';
import { dryRunSchema, mutationSummary, runCreate } from './resourceMutationShared.js';
import { controllerInputSchema } from './siteAdminShared.js';

const inputSchema = controllerInputSchema.extend({
    payload: siteTemplateCreateSchema.describe(
        'Site template (official CreateSiteTemplateEntity): name and optional settings modules from listSiteTemplateModules (e.g. firewall, log, applicationControl).'
    ),
    dryRun: dryRunSchema,
});

type Client = Pick<OmadaClient, 'createSiteTemplate' | 'getSiteTemplateList'>;

export function registerCreateSiteTemplateTool(server: McpServer, client: Client): void {
    server.registerTool(
        'createSiteTemplate',
        {
            description:
                'Create a site template whose settings can then be applied to many sites. Defaults to a preview; set dryRun:false to create once and verify by readback.',
            inputSchema: inputSchema.shape,
            annotations: { destructiveHint: true },
        },
        wrapMutationToolHandler<typeof inputSchema.shape>(
            'createSiteTemplate',
            mutationSummary('create-site-template', (args) => String((args.payload as { name?: unknown }).name)),
            async ({ payload, customHeaders, dryRun }) =>
                await runCreate({
                    spec: {
                        label: 'site template',
                        list: async () => ((await client.getSiteTemplateList(1, 1000, customHeaders)) as { data?: unknown })?.data ?? [],
                        writeOnly: ['settings'],
                    },
                    payload,
                    dryRun,
                    write: () => client.createSiteTemplate(payload, customHeaders),
                })
        )
    );
}
