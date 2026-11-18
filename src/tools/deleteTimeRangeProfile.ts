import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import type { OmadaClient } from '../omadaClient/index.js';
import { siteInputSchema, wrapMutationToolHandler } from '../server/common.js';
import { dryRunSchema, mutationSummary, runDelete } from './resourceMutationShared.js';

const inputSchema = siteInputSchema.extend({
    profileId: z.string().trim().min(1).describe('Time range profile ID (profileId) from listTimeRangeProfiles.'),
    dryRun: dryRunSchema,
});

type Client = Pick<OmadaClient, 'deleteTimeRangeProfile' | 'listTimeRangeProfiles'>;

export function registerDeleteTimeRangeProfileTool(server: McpServer, client: Client): void {
    server.registerTool(
        'deleteTimeRangeProfile',
        {
            description:
                'Delete a time range profile. The controller refuses profiles still referenced by schedules or rules. Defaults to a preview of the record; set dryRun:false to delete and verify it is gone.',
            inputSchema: inputSchema.shape,
            annotations: { destructiveHint: true },
        },
        wrapMutationToolHandler<typeof inputSchema.shape>(
            'deleteTimeRangeProfile',
            mutationSummary('delete-time-range-profile', (args) => String(args.profileId)),
            async ({ profileId, siteId, customHeaders, dryRun }) =>
                await runDelete({
                    spec: {
                        label: 'time range profile',
                        list: () => client.listTimeRangeProfiles(siteId, customHeaders),
                        idKeys: ['profileId', 'id'],
                    },
                    id: profileId,
                    dryRun,
                    write: () => client.deleteTimeRangeProfile(profileId, siteId, customHeaders),
                })
        )
    );
}
