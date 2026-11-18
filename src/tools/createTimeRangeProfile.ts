import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import type { OmadaClient } from '../omadaClient/index.js';
import { createTimeRangeProfileOpenApiVOSchema } from '../omadaClient/requestSchemas.js';
import { siteInputSchema, wrapMutationToolHandler } from '../server/common.js';
import { dryRunSchema, mutationSummary, runCreate } from './resourceMutationShared.js';

const inputSchema = siteInputSchema.extend({
    payload: createTimeRangeProfileOpenApiVOSchema.describe(
        'Time range profile (official CreateTimeRangeProfileOpenApiVO): name, dayMode (0 every day, 1 weekdays, 2 weekend, 3 custom with customDayMode) and timeList windows on 15-minute boundaries (dayType 0 unless dayMode is 3).'
    ),
    dryRun: dryRunSchema,
});

type Client = Pick<OmadaClient, 'createTimeRangeProfile' | 'listTimeRangeProfiles'>;

export function registerCreateTimeRangeProfileTool(server: McpServer, client: Client): void {
    server.registerTool(
        'createTimeRangeProfile',
        {
            description:
                'Create a time range profile used by port schedules, PoE schedules and firewall rules. Defaults to a preview; set dryRun:false to apply once and verify by reading the controller back.',
            inputSchema: inputSchema.shape,
            annotations: { destructiveHint: true },
        },
        wrapMutationToolHandler<typeof inputSchema.shape>(
            'createTimeRangeProfile',
            mutationSummary('create-time-range-profile', (args) => String((args.payload as { name?: unknown }).name)),
            async ({ payload, siteId, customHeaders, dryRun }) =>
                await runCreate({
                    spec: {
                        label: 'time range profile',
                        list: () => client.listTimeRangeProfiles(siteId, customHeaders),
                        idKeys: ['profileId', 'id'],
                    },
                    payload,
                    dryRun,
                    write: () => client.createTimeRangeProfile(payload, siteId, customHeaders),
                })
        )
    );
}
