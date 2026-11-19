import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import type { OmadaClient } from '../omadaClient/index.js';
import { siteInputSchema, wrapMutationToolHandler } from '../server/common.js';
import { dryRunSchema, mutationSummary, runDelete } from './resourceMutationShared.js';

const inputSchema = siteInputSchema.extend({
    multicastId: z.string().trim().min(1).describe('Multicast configuration ID from listLanMulticasts.'),
    dryRun: dryRunSchema,
});

type Client = Pick<OmadaClient, 'deleteLanMulticast' | 'listLanMulticasts'>;

export function registerDeleteLanMulticastTool(server: McpServer, client: Client): void {
    server.registerTool(
        'deleteLanMulticast',
        {
            description:
                'Delete a multicast snooping configuration; its networks flood multicast again. Defaults to a preview; set dryRun:false to delete and verify it is gone.',
            inputSchema: inputSchema.shape,
            annotations: { destructiveHint: true },
        },
        wrapMutationToolHandler<typeof inputSchema.shape>(
            'deleteLanMulticast',
            mutationSummary('delete-lan-multicast', (args) => String(args.multicastId)),
            async ({ multicastId, siteId, customHeaders, dryRun }) =>
                await runDelete({
                    spec: { label: 'LAN multicast', list: () => client.listLanMulticasts(siteId, customHeaders) },
                    id: multicastId,
                    dryRun,
                    write: () => client.deleteLanMulticast(multicastId, siteId, customHeaders),
                    warnings: ['Multicast on these networks is flooded to all ports again.'],
                })
        )
    );
}
