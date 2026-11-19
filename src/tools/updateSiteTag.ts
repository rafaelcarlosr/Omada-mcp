import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import type { OmadaClient } from '../omadaClient/index.js';
import { wrapMutationToolHandler } from '../server/common.js';
import { dryRunSchema, mutationSummary, runUpdate } from './resourceMutationShared.js';
import { controllerInputSchema } from './siteAdminShared.js';

const inputSchema = controllerInputSchema.extend({
    tagId: z.string().trim().min(1).describe('Site tag ID from listSiteTags.'),
    payload: z
        .object({ name: z.string().min(1).max(128).describe('New tag name, 1-128 ASCII characters.') })
        .strict()
        .describe('Site tag change (official Site Tag): name.'),
    dryRun: dryRunSchema,
});

type Client = Pick<OmadaClient, 'listSiteTags' | 'updateSiteTag'>;

export function registerUpdateSiteTagTool(server: McpServer, client: Client): void {
    server.registerTool(
        'updateSiteTag',
        {
            description: 'Rename a site tag. Defaults to a preview; set dryRun:false to apply once and verify by readback.',
            inputSchema: inputSchema.shape,
            annotations: { destructiveHint: true },
        },
        wrapMutationToolHandler<typeof inputSchema.shape>(
            'updateSiteTag',
            mutationSummary('update-site-tag', (args) => String(args.tagId)),
            async ({ tagId, payload, customHeaders, dryRun }) =>
                await runUpdate({
                    spec: { label: 'site tag', list: () => client.listSiteTags(customHeaders), idKeys: ['tagId'] },
                    id: tagId,
                    payload,
                    dryRun,
                    write: () => client.updateSiteTag(tagId, payload.name, customHeaders),
                })
        )
    );
}
