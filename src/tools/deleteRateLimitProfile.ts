import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import type { OmadaClient } from '../omadaClient/index.js';
import { siteInputSchema, wrapMutationToolHandler } from '../server/common.js';
import { refuseBuiltInProfile } from './profileShared.js';
import { dryRunSchema, mutationSummary, runDelete } from './resourceMutationShared.js';

const inputSchema = siteInputSchema.extend({
    profileId: z.string().trim().min(1).describe('Rate limit profile ID (profileId) from getRateLimitProfiles.'),
    dryRun: dryRunSchema,
});

type Client = Pick<OmadaClient, 'deleteRateLimitProfile' | 'getRateLimitProfiles'>;

export function registerDeleteRateLimitProfileTool(server: McpServer, client: Client): void {
    server.registerTool(
        'deleteRateLimitProfile',
        {
            description:
                'Delete a rate limit profile. The built-in Default profile is refused. Defaults to a preview of the record; set dryRun:false to delete and verify it is gone.',
            inputSchema: inputSchema.shape,
            annotations: { destructiveHint: true },
        },
        wrapMutationToolHandler<typeof inputSchema.shape>(
            'deleteRateLimitProfile',
            mutationSummary('delete-rate-limit-profile', (args) => String(args.profileId)),
            async ({ profileId, siteId, customHeaders, dryRun }) =>
                await runDelete({
                    spec: {
                        label: 'rate limit profile',
                        list: () => client.getRateLimitProfiles(siteId, customHeaders),
                        idKeys: ['profileId'],
                    },
                    id: profileId,
                    dryRun,
                    guard: refuseBuiltInProfile('rate limit profile'),
                    write: () => client.deleteRateLimitProfile(profileId, siteId, customHeaders),
                    warnings: ['Clients and SSIDs that use this profile lose its limits; check where it is used first.'],
                })
        )
    );
}
