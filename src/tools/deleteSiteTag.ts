import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import type { OmadaClient } from '../omadaClient/index.js';
import { wrapMutationToolHandler } from '../server/common.js';
import { dryRunSchema, mutationSummary, runDelete } from './resourceMutationShared.js';
import { controllerInputSchema } from './siteAdminShared.js';

const inputSchema = controllerInputSchema.extend({
    tagId: z.string().trim().min(1).describe('Site tag ID from listSiteTags.'),
    dryRun: dryRunSchema,
});

type Client = Pick<OmadaClient, 'deleteSiteTag' | 'listSiteTags'>;

export function registerDeleteSiteTagTool(server: McpServer, client: Client): void {
    server.registerTool(
        'deleteSiteTag',
        {
            description:
                'Delete a site tag; the controller removes it from every site that has it. Defaults to a preview; set dryRun:false to delete and verify it is gone.',
            inputSchema: inputSchema.shape,
            annotations: { destructiveHint: true },
        },
        wrapMutationToolHandler<typeof inputSchema.shape>(
            'deleteSiteTag',
            mutationSummary('delete-site-tag', (args) => String(args.tagId)),
            async ({ tagId, customHeaders, dryRun }) =>
                await runDelete({
                    spec: { label: 'site tag', list: () => client.listSiteTags(customHeaders), idKeys: ['tagId'] },
                    id: tagId,
                    dryRun,
                    write: () => client.deleteSiteTag(tagId, customHeaders),
                    warnings: ['The tag is removed from every site that has it.'],
                })
        )
    );
}
