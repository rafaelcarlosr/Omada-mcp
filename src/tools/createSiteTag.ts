import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import type { OmadaClient } from '../omadaClient/index.js';
import { createSiteTagOpenApiVO02Schema } from '../omadaClient/requestSchemas.js';
import { wrapMutationToolHandler } from '../server/common.js';
import { dryRunSchema, mutationSummary, runCreate } from './resourceMutationShared.js';
import { controllerInputSchema } from './siteAdminShared.js';

const inputSchema = controllerInputSchema.extend({
    payload: createSiteTagOpenApiVO02Schema.required().describe('Site tag (official CreateSiteTagOpenApiVO): name of 1-128 ASCII characters.'),
    dryRun: dryRunSchema,
});

type Client = Pick<OmadaClient, 'createSiteTag' | 'listSiteTags'>;

export function registerCreateSiteTagTool(server: McpServer, client: Client): void {
    server.registerTool(
        'createSiteTag',
        {
            description: 'Create a site tag for grouping sites. Defaults to a preview; set dryRun:false to create once and verify by readback.',
            inputSchema: inputSchema.shape,
            annotations: { destructiveHint: true },
        },
        wrapMutationToolHandler<typeof inputSchema.shape>(
            'createSiteTag',
            mutationSummary('create-site-tag', (args) => String((args.payload as { name?: unknown }).name)),
            async ({ payload, customHeaders, dryRun }) =>
                await runCreate({
                    spec: { label: 'site tag', list: () => client.listSiteTags(customHeaders), idKeys: ['tagId'] },
                    payload,
                    dryRun,
                    write: () => client.createSiteTag(payload, customHeaders),
                })
        )
    );
}
