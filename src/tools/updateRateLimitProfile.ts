import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import type { OmadaClient } from '../omadaClient/index.js';
import { updateRateLimitProfileOpenApiVOSchema } from '../omadaClient/requestSchemas.js';
import { siteInputSchema, wrapMutationToolHandler } from '../server/common.js';
import { refuseBuiltInProfile } from './profileShared.js';
import { dryRunSchema, mutationSummary, runUpdate } from './resourceMutationShared.js';

const inputSchema = siteInputSchema.extend({
    profileId: z.string().trim().min(1).describe('Rate limit profile ID (profileId) from getRateLimitProfiles.'),
    payload: updateRateLimitProfileOpenApiVOSchema.describe('Complete rate limit profile (official UpdateRateLimitProfileOpenApiVO).'),
    dryRun: dryRunSchema,
});

type Client = Pick<OmadaClient, 'getRateLimitProfiles' | 'updateRateLimitProfile'>;

export function registerUpdateRateLimitProfileTool(server: McpServer, client: Client): void {
    server.registerTool(
        'updateRateLimitProfile',
        {
            description:
                'Replace the name and limits of a rate limit profile. The built-in Default profile is refused. Defaults to a preview; set dryRun:false to apply once and verify by readback.',
            inputSchema: inputSchema.shape,
            annotations: { destructiveHint: true },
        },
        wrapMutationToolHandler<typeof inputSchema.shape>(
            'updateRateLimitProfile',
            mutationSummary('update-rate-limit-profile', (args) => String(args.profileId)),
            async ({ profileId, payload, siteId, customHeaders, dryRun }) =>
                await runUpdate({
                    spec: {
                        label: 'rate limit profile',
                        list: () => client.getRateLimitProfiles(siteId, customHeaders),
                        idKeys: ['profileId'],
                    },
                    id: profileId,
                    payload,
                    dryRun,
                    guard: refuseBuiltInProfile('rate limit profile'),
                    write: () => client.updateRateLimitProfile(profileId, payload, siteId, customHeaders),
                })
        )
    );
}
