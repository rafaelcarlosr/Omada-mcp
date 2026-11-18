import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import type { OmadaClient } from '../omadaClient/index.js';
import { updateTimeRangeProfileOpenApiVOSchema } from '../omadaClient/requestSchemas.js';
import { siteInputSchema, wrapMutationToolHandler } from '../server/common.js';
import { dryRunSchema, mutationSummary, runUpdate } from './resourceMutationShared.js';

const inputSchema = siteInputSchema.extend({
    profileId: z.string().trim().min(1).describe('Time range profile ID (profileId) from listTimeRangeProfiles.'),
    payload: updateTimeRangeProfileOpenApiVOSchema.describe('Complete time range profile (official UpdateTimeRangeProfileOpenApiVO).'),
    dryRun: dryRunSchema,
});

type Client = Pick<OmadaClient, 'listTimeRangeProfiles' | 'updateTimeRangeProfile'>;

export function registerUpdateTimeRangeProfileTool(server: McpServer, client: Client): void {
    server.registerTool(
        'updateTimeRangeProfile',
        {
            description:
                'Replace a time range profile; every schedule and rule that uses it follows the new windows. Defaults to a preview; set dryRun:false to apply once and verify by readback.',
            inputSchema: inputSchema.shape,
            annotations: { destructiveHint: true },
        },
        wrapMutationToolHandler<typeof inputSchema.shape>(
            'updateTimeRangeProfile',
            mutationSummary('update-time-range-profile', (args) => String(args.profileId)),
            async ({ profileId, payload, siteId, customHeaders, dryRun }) =>
                await runUpdate({
                    spec: {
                        label: 'time range profile',
                        list: () => client.listTimeRangeProfiles(siteId, customHeaders),
                        idKeys: ['profileId', 'id'],
                    },
                    id: profileId,
                    payload,
                    dryRun,
                    write: () => client.updateTimeRangeProfile(profileId, payload, siteId, customHeaders),
                    warnings: ['Schedules, PoE schedules and rules that reference this profile change behaviour immediately.'],
                })
        )
    );
}
