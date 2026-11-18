import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import type { OmadaClient } from '../omadaClient/index.js';
import { siteInputSchema, wrapMutationToolHandler } from '../server/common.js';
import { dryRunSchema, mutationSummary, runDelete } from './resourceMutationShared.js';

const inputSchema = siteInputSchema.extend({
    tagId: z.string().trim().min(1).describe('Port label ID (tagId) from listSwitchPortTags.'),
    dryRun: dryRunSchema,
});

type Client = Pick<OmadaClient, 'deleteSwitchPortTag' | 'listSwitchPortTags'>;

export function registerDeleteSwitchPortTagTool(server: McpServer, client: Client): void {
    server.registerTool(
        'deleteSwitchPortTag',
        {
            description:
                'Delete a switch port label; it is removed from every port that uses it. Defaults to a preview of the record; set dryRun:false to delete and verify it is gone.',
            inputSchema: inputSchema.shape,
            annotations: { destructiveHint: true },
        },
        wrapMutationToolHandler<typeof inputSchema.shape>(
            'deleteSwitchPortTag',
            mutationSummary('delete-switch-port-tag', (args) => String(args.tagId)),
            async ({ tagId, siteId, customHeaders, dryRun }) =>
                await runDelete({
                    spec: { label: 'switch port label', list: () => client.listSwitchPortTags(siteId, customHeaders), idKeys: ['tagId'] },
                    id: tagId,
                    dryRun,
                    write: () => client.deleteSwitchPortTag(tagId, siteId, customHeaders),
                    warnings: ['The label is removed from every switch port that uses it.'],
                })
        )
    );
}
