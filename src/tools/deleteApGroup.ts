import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import type { OmadaClient } from '../omadaClient/index.js';
import { siteInputSchema, wrapMutationToolHandler } from '../server/common.js';
import { dryRunSchema, mutationSummary, runDelete } from './resourceMutationShared.js';

const inputSchema = siteInputSchema.extend({
    apGroupId: z.string().trim().min(1).describe('AP group ID from listApGroups.'),
    dryRun: dryRunSchema,
});

type Client = Pick<OmadaClient, 'deleteApGroup' | 'listApGroups'>;

export function registerDeleteApGroupTool(server: McpServer, client: Client): void {
    server.registerTool(
        'deleteApGroup',
        {
            description:
                'Delete an AP group. The default (primary) group is refused. Defaults to a preview with its AP count; set dryRun:false to delete and verify it is gone.',
            inputSchema: inputSchema.shape,
            annotations: { destructiveHint: true },
        },
        wrapMutationToolHandler<typeof inputSchema.shape>(
            'deleteApGroup',
            mutationSummary('delete-ap-group', (args) => String(args.apGroupId)),
            async ({ apGroupId, siteId, customHeaders, dryRun }) =>
                await runDelete({
                    spec: { label: 'AP group', list: () => client.listApGroups(siteId, customHeaders) },
                    id: apGroupId,
                    dryRun,
                    guard: (group) => {
                        if (group.primary === true)
                            throw new Error(`"${String(group.name)}" is the default AP group and cannot be deleted. No request was sent.`);
                    },
                    write: () => client.deleteApGroup(apGroupId, siteId, customHeaders),
                    warnings: ['APs in the deleted group return to the default group and broadcast its SSIDs.'],
                })
        )
    );
}
