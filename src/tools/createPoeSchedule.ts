import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import type { OmadaClient } from '../omadaClient/index.js';
import { poeSchedulePayloadSchema } from '../omadaClient/siteServices.js';
import { siteInputSchema, wrapMutationToolHandler } from '../server/common.js';
import { dryRunSchema, mutationSummary, runCreate } from './resourceMutationShared.js';

const inputSchema = siteInputSchema.extend({
    payload: poeSchedulePayloadSchema.describe(
        'PoE schedule (official PoeScheduleOpenApiVO): name, status, turnOnTime = time range profile ID from listTimeRangeProfiles, and poePortsMap from switch MAC to PoE port numbers.'
    ),
    dryRun: dryRunSchema,
});

type Client = Pick<OmadaClient, 'createPoeSchedule' | 'listPoeSchedules'>;

export function registerCreatePoeScheduleTool(server: McpServer, client: Client): void {
    server.registerTool(
        'createPoeSchedule',
        {
            description:
                'Create a PoE schedule that powers switch PoE ports only inside a time range profile; outside it the ports stop supplying power. Defaults to a preview; set dryRun:false to apply once and verify by readback.',
            inputSchema: inputSchema.shape,
            annotations: { destructiveHint: true },
        },
        wrapMutationToolHandler<typeof inputSchema.shape>(
            'createPoeSchedule',
            mutationSummary('create-poe-schedule', (args) => String((args.payload as { name?: unknown }).name)),
            async ({ payload, siteId, customHeaders, dryRun }) =>
                await runCreate({
                    spec: {
                        label: 'PoE schedule',
                        list: () => client.listPoeSchedules(siteId, customHeaders),
                    },
                    payload,
                    dryRun,
                    write: () => client.createPoeSchedule(payload, siteId, customHeaders),
                    warnings: ['Devices powered by these ports (APs, cameras, phones) lose power outside the time range.'],
                })
        )
    );
}
