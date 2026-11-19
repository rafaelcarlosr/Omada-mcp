import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import type { OmadaClient } from '../omadaClient/index.js';
import { siteInputSchema, wrapMutationToolHandler } from '../server/common.js';
import { allIncidents } from './incidentShared.js';
import { dryRunSchema, findRecord, mutationSummary, runAction } from './resourceMutationShared.js';

const inputSchema = siteInputSchema.extend({
    incidentIds: z.array(z.string().trim().min(1)).min(1).max(1000).describe('Incident IDs from listAnomalyIncidents in the same period.'),
    targetStatus: z.number().int().min(0).max(2).describe('New status: 0 unresolved, 1 resolved, 2 ignored.'),
    startTime: z.number().int().nonnegative().describe('Start of the period that contains the incidents, epoch milliseconds.'),
    endTime: z.number().int().nonnegative().describe('End of the period that contains the incidents, epoch milliseconds.'),
    dryRun: dryRunSchema,
});

type Client = Pick<OmadaClient, 'listAnomalyIncidents' | 'setIncidentStatus'>;

export function registerSetIncidentStatusTool(server: McpServer, client: Client): void {
    server.registerTool(
        'setIncidentStatus',
        {
            description:
                'Mark selected incidents as unresolved, resolved or ignored, by ID. Only the listed IDs change, never "all". Defaults to a preview of the incidents; set dryRun:false to apply.',
            inputSchema: inputSchema.shape,
            annotations: { destructiveHint: true },
        },
        wrapMutationToolHandler<typeof inputSchema.shape>(
            'setIncidentStatus',
            mutationSummary('set-incident-status', (args) => `${(args.incidentIds as string[]).length} incident(s)`),
            async ({ incidentIds, targetStatus, startTime, endTime, siteId, customHeaders, dryRun }) =>
                await runAction({
                    label: 'incident status',
                    dryRun,
                    preflight: async () => {
                        if (startTime >= endTime) throw new Error('startTime must be before endTime.');
                        const incidents = await allIncidents(client, { startTime, endTime }, siteId, customHeaders);
                        const missing = incidentIds.filter((id) => !findRecord(incidents, id));
                        if (missing.length) throw new Error(`No incident with id ${missing.join(', ')} in this period. No request was sent.`);
                        return { targetStatus, incidents: incidentIds.map((id) => findRecord(incidents, id)) };
                    },
                    write: () => client.setIncidentStatus(incidentIds, targetStatus, siteId, customHeaders),
                })
        )
    );
}
