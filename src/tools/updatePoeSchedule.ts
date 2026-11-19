import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import type { OmadaClient } from '../omadaClient/index.js';
import { poeSchedulePayloadSchema } from '../omadaClient/siteServices.js';
import { siteInputSchema, wrapMutationToolHandler } from '../server/common.js';
import { dryRunSchema, mutationSummary, runUpdate } from './resourceMutationShared.js';

const inputSchema = siteInputSchema.extend({
    poeScheduleId: z.string().trim().min(1).describe('PoE schedule ID from listPoeSchedules.'),
    payload: poeSchedulePayloadSchema.describe('Complete PoE schedule (official PoeScheduleOpenApiVO).'),
    dryRun: dryRunSchema,
});

type Client = Pick<OmadaClient, 'listPoeSchedules' | 'updatePoeSchedule'>;

export function registerUpdatePoeScheduleTool(server: McpServer, client: Client): void {
    server.registerTool(
        'updatePoeSchedule',
        {
            description:
                'Replace a PoE schedule (status, time range, switch ports). Defaults to a preview; set dryRun:false to apply once and verify by readback.',
            inputSchema: inputSchema.shape,
            annotations: { destructiveHint: true },
        },
        wrapMutationToolHandler<typeof inputSchema.shape>(
            'updatePoeSchedule',
            mutationSummary('update-poe-schedule', (args) => String(args.poeScheduleId)),
            async ({ poeScheduleId, payload, siteId, customHeaders, dryRun }) =>
                await runUpdate({
                    spec: {
                        label: 'PoE schedule',
                        list: () => client.listPoeSchedules(siteId, customHeaders),
                    },
                    id: poeScheduleId,
                    payload,
                    dryRun,
                    write: () => client.updatePoeSchedule(poeScheduleId, payload, siteId, customHeaders),
                    warnings: ['Devices powered by these ports (APs, cameras, phones) lose power outside the time range.'],
                })
        )
    );
}
