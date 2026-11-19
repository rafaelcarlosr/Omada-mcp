import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import type { OmadaClient } from '../omadaClient/index.js';
import { bonjourServicePayloadSchema } from '../omadaClient/profiles.js';
import { siteInputSchema, wrapMutationToolHandler } from '../server/common.js';
import { refuseBuiltInProfile } from './profileShared.js';
import { dryRunSchema, mutationSummary, runUpdate } from './resourceMutationShared.js';

const inputSchema = siteInputSchema.extend({
    profileId: z.string().trim().min(1).describe('Bonjour service ID from listMdnsProfile.'),
    payload: bonjourServicePayloadSchema.describe('Complete Bonjour service (official BonjourServiceOpenApiVO).'),
    dryRun: dryRunSchema,
});

type Client = Pick<OmadaClient, 'listMdnsProfile' | 'updateMdnsProfile'>;

export function registerUpdateMdnsProfileTool(server: McpServer, client: Client): void {
    server.registerTool(
        'updateMdnsProfile',
        {
            description:
                'Replace the name and service IDs of a Bonjour service. Built-in services (AirPlay, AFP and others) are refused. Defaults to a preview; set dryRun:false to apply once and verify by readback.',
            inputSchema: inputSchema.shape,
            annotations: { destructiveHint: true },
        },
        wrapMutationToolHandler<typeof inputSchema.shape>(
            'updateMdnsProfile',
            mutationSummary('update-mdns-profile', (args) => String(args.profileId)),
            async ({ profileId, payload, siteId, customHeaders, dryRun }) =>
                await runUpdate({
                    spec: {
                        label: 'Bonjour service',
                        list: () => client.listMdnsProfile(siteId, customHeaders),
                    },
                    id: profileId,
                    payload,
                    dryRun,
                    guard: refuseBuiltInProfile('Bonjour service'),
                    write: () => client.updateMdnsProfile(profileId, payload, siteId, customHeaders),
                })
        )
    );
}
