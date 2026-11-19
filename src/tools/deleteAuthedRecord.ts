import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import type { OmadaClient } from '../omadaClient/index.js';
import { siteInputSchema, wrapMutationToolHandler } from '../server/common.js';
import { dryRunSchema, mutationSummary, runDelete } from './resourceMutationShared.js';

const inputSchema = siteInputSchema.extend({
    recordId: z.string().trim().min(1).describe('Authorization record ID from listHotspotAuthRecords.'),
    dryRun: dryRunSchema,
});

type Client = Pick<OmadaClient, 'deleteAuthedRecord' | 'listHotspotAuthRecords'>;

export function registerDeleteAuthedRecordTool(server: McpServer, client: Client): void {
    server.registerTool(
        'deleteAuthedRecord',
        {
            description:
                'Delete a hotspot authorization record; an active client has to pass the portal again. Defaults to a preview; set dryRun:false to delete and verify it is gone.',
            inputSchema: inputSchema.shape,
            annotations: { destructiveHint: true },
        },
        wrapMutationToolHandler<typeof inputSchema.shape>(
            'deleteAuthedRecord',
            mutationSummary('delete-authed-record', (args) => String(args.recordId)),
            async ({ recordId, siteId, customHeaders, dryRun }) =>
                await runDelete({
                    spec: { label: 'authorization record', list: () => client.listHotspotAuthRecords(siteId, customHeaders), nameKey: null },
                    id: recordId,
                    dryRun,
                    write: () => client.deleteAuthedRecord(recordId, siteId, customHeaders),
                    warnings: ['A client still connected with this authorization has to pass the portal again.'],
                })
        )
    );
}
