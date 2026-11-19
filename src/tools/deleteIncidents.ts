import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import type { OmadaClient } from '../omadaClient/index.js';
import { siteInputSchema, wrapMutationToolHandler } from '../server/common.js';
import { allIncidents } from './incidentShared.js';
import { dryRunSchema, mutationSummary, runBatchDelete } from './resourceMutationShared.js';

const inputSchema = siteInputSchema.extend({
    incidentIds: z.array(z.string().trim().min(1)).min(1).max(1000).describe('Incident IDs from listAnomalyIncidents in the same period.'),
    startTime: z.number().int().nonnegative().describe('Start of the period that contains the incidents, epoch milliseconds.'),
    endTime: z.number().int().nonnegative().describe('End of the period that contains the incidents, epoch milliseconds.'),
    dryRun: dryRunSchema,
});

type Client = Pick<OmadaClient, 'deleteIncidents' | 'listAnomalyIncidents'>;

export function registerDeleteIncidentsTool(server: McpServer, client: Client): void {
    server.registerTool(
        'deleteIncidents',
        {
            description:
                'Delete selected incidents by ID. Only the listed IDs are deleted, never "all"; deleted incidents cannot be restored. Defaults to a preview; set dryRun:false to delete and verify they are gone.',
            inputSchema: inputSchema.shape,
            annotations: { destructiveHint: true },
        },
        wrapMutationToolHandler<typeof inputSchema.shape>(
            'deleteIncidents',
            mutationSummary('delete-incidents', (args) => `${(args.incidentIds as string[]).length} incident(s)`),
            async ({ incidentIds, startTime, endTime, siteId, customHeaders, dryRun }) => {
                if (startTime >= endTime) throw new Error('startTime must be before endTime.');
                return await runBatchDelete({
                    spec: {
                        label: 'incident',
                        list: () => allIncidents(client, { startTime, endTime }, siteId, customHeaders),
                        nameKey: null,
                    },
                    ids: incidentIds,
                    dryRun,
                    write: () => client.deleteIncidents(incidentIds, siteId, customHeaders),
                    warnings: ['Deleted incidents cannot be restored.'],
                });
            }
        )
    );
}
