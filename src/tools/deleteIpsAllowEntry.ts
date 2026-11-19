import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import type { OmadaClient } from '../omadaClient/index.js';
import { siteInputSchema, wrapMutationToolHandler } from '../server/common.js';
import { allPages } from './ipsShared.js';
import { dryRunSchema, mutationSummary, runDelete } from './resourceMutationShared.js';

const inputSchema = siteInputSchema.extend({
    entryId: z.string().trim().min(1).describe('Entry ID from getGridAllowList.'),
    dryRun: dryRunSchema,
});

type Client = Pick<OmadaClient, 'deleteIpsAllowEntry' | 'getGridAllowList'>;

export function registerDeleteIpsAllowEntryTool(server: McpServer, client: Client): void {
    server.registerTool(
        'deleteIpsAllowEntry',
        {
            description:
                'Delete an IPS allow list entry. The target is subject to IPS blocking again. Defaults to a preview; set dryRun:false to delete and verify it is gone.',
            inputSchema: inputSchema.shape,
            annotations: { destructiveHint: true },
        },
        wrapMutationToolHandler<typeof inputSchema.shape>(
            'deleteIpsAllowEntry',
            mutationSummary('delete-ips-allow-entry', (args) => String(args.entryId)),
            async ({ entryId, siteId, customHeaders, dryRun }) =>
                await runDelete({
                    spec: {
                        label: 'IPS allow list entry',
                        list: () => allPages((page, size) => client.getGridAllowList(page, size, undefined, siteId, customHeaders)),
                        nameKey: null,
                    },
                    id: entryId,
                    dryRun,
                    write: () => client.deleteIpsAllowEntry(entryId, siteId, customHeaders),
                    warnings: ['The target is subject to IPS blocking again.'],
                })
        )
    );
}
