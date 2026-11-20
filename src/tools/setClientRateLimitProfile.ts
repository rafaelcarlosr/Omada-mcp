import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import type { OmadaClient } from '../omadaClient/index.js';
import { deviceMacSchema, siteInputSchema, wrapMutationToolHandler } from '../server/common.js';
import { requireClientDetail, runSettings } from './resourceMutationShared.js';

export function registerSetClientRateLimitProfileTool(server: McpServer, client: OmadaClient): void {
    const inputSchema = siteInputSchema.extend({
        clientMac: deviceMacSchema,
        profileId: z.string().min(1).describe('Rate limit profile ID (profileId from getRateLimitProfiles).'),
        dryRun: z.boolean().optional().default(true).describe('Preview without changing the controller. Set false explicitly to apply.'),
    });
    server.registerTool(
        'setClientRateLimitProfile',
        {
            description:
                'Apply a predefined client rate limit profile. Use getRateLimitProfiles to discover profiles. Preview is the default; set dryRun:false to apply once and verify by reading the client back.',
            inputSchema: inputSchema.shape,
            annotations: { readOnlyHint: false, destructiveHint: true },
        },
        wrapMutationToolHandler(
            'setClientRateLimitProfile',
            ({ clientMac, siteId }, result, mode) => ({
                action: 'setClientRateLimitProfile',
                target: clientMac,
                siteId,
                mode,
                status: mode === 'dry-run' ? 'planned' : 'submitted',
                summary: mode === 'dry-run' ? 'Client rate-limit change planned.' : 'Client rate-limit change submitted.',
                result,
            }),
            async ({ clientMac, profileId, siteId, customHeaders, dryRun }) => {
                const profiles = await client.getRateLimitProfiles(siteId, customHeaders);
                if (!profiles.some((profile) => (profile.profileId ?? profile.id) === profileId)) {
                    throw new Error(`No rate limit profile with ID ${profileId} exists in this site. No request was sent.`);
                }
                return await runSettings({
                    label: 'client rate limit',
                    read: async () =>
                        (await requireClientDetail(() => client.getClientDetail(clientMac, siteId, customHeaders), clientMac)).rateLimit,
                    // The client readback names the applied profile rateLimitId.
                    payload: { rateLimitId: profileId },
                    dryRun,
                    write: () => client.setClientRateLimitProfile(clientMac, profileId, siteId, customHeaders),
                });
            }
        )
    );
}
