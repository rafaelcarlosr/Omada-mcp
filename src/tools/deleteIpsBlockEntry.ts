import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import type { OmadaClient } from '../omadaClient/index.js';
import { siteInputSchema, wrapMutationToolHandler } from '../server/common.js';
import { allPages } from './ipsShared.js';
import { dryRunSchema, mutationSummary, runDelete } from './resourceMutationShared.js';

const inputSchema = siteInputSchema.extend({
    entryId: z.string().trim().min(1).describe('Entry ID from getGridBlockList.'),
    dryRun: dryRunSchema,
});

type Client = Pick<OmadaClient, 'deleteIpsBlockEntry' | 'getGridBlockList'>;

export function registerDeleteIpsBlockEntryTool(server: McpServer, client: Client): void {
    server.registerTool(
        'deleteIpsBlockEntry',
        {
            description:
                'Delete an IPS block list entry. The blocked target can reach the network again. Defaults to a preview; set dryRun:false to delete and verify it is gone.',
            inputSchema: inputSchema.shape,
            annotations: { destructiveHint: true },
        },
        wrapMutationToolHandler<typeof inputSchema.shape>(
            'deleteIpsBlockEntry',
            mutationSummary('delete-ips-block-entry', (args) => String(args.entryId)),
            async ({ entryId, siteId, customHeaders, dryRun }) =>
                await runDelete({
                    spec: {
                        label: 'IPS block list entry',
                        list: () => allPages((page, size) => client.getGridBlockList(page, size, undefined, siteId, customHeaders)),
                        nameKey: null,
                    },
                    id: entryId,
                    dryRun,
                    write: () => client.deleteIpsBlockEntry(entryId, siteId, customHeaders),
                    warnings: ['The blocked target can reach the network again.'],
                })
        )
    );
}
