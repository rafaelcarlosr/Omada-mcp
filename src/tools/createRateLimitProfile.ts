import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import type { OmadaClient } from '../omadaClient/index.js';
import { createRateLimitProfileOpenApiVOSchema } from '../omadaClient/requestSchemas.js';
import { siteInputSchema, wrapMutationToolHandler } from '../server/common.js';
import { dryRunSchema, mutationSummary, runCreate } from './resourceMutationShared.js';

const inputSchema = siteInputSchema.extend({
    payload: createRateLimitProfileOpenApiVOSchema.describe(
        'Rate limit profile (official CreateRateLimitProfileOpenApiVO): name, downLimitEnable/upLimitEnable and downLimit/upLimit in Kbps (1-10485760) when enabled.'
    ),
    dryRun: dryRunSchema,
});

type Client = Pick<OmadaClient, 'createRateLimitProfile' | 'getRateLimitProfiles'>;

export function registerCreateRateLimitProfileTool(server: McpServer, client: Client): void {
    server.registerTool(
        'createRateLimitProfile',
        {
            description:
                'Create a client rate limit profile with optional download and upload limits in Kbps. Defaults to a preview; set dryRun:false to apply once and verify by readback.',
            inputSchema: inputSchema.shape,
            annotations: { destructiveHint: true },
        },
        wrapMutationToolHandler<typeof inputSchema.shape>(
            'createRateLimitProfile',
            mutationSummary('create-rate-limit-profile', (args) => String((args.payload as { name?: unknown }).name)),
            async ({ payload, siteId, customHeaders, dryRun }) =>
                await runCreate({
                    spec: {
                        label: 'rate limit profile',
                        list: () => client.getRateLimitProfiles(siteId, customHeaders),
                        idKeys: ['profileId'],
                    },
                    payload,
                    dryRun,
                    write: () => client.createRateLimitProfile(payload, siteId, customHeaders),
                })
        )
    );
}
