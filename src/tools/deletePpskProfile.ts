import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import type { OmadaClient } from '../omadaClient/index.js';
import { siteInputSchema, wrapMutationToolHandler } from '../server/common.js';
import { dryRunSchema, mutationSummary, runDelete, toRecords } from './resourceMutationShared.js';

const inputSchema = siteInputSchema.extend({
    profileId: z.string().trim().min(1).describe('PPSK profile ID from getPPSKProfiles.'),
    dryRun: dryRunSchema,
});

type Client = Pick<OmadaClient, 'deletePpskProfile' | 'getPPSKProfiles'>;

export function registerDeletePpskProfileTool(server: McpServer, client: Client): void {
    server.registerTool(
        'deletePpskProfile',
        {
            description:
                'Delete a PPSK profile; the controller refuses profiles still used by an SSID. Clients using its PSKs can no longer join. Defaults to a preview; set dryRun:false to delete and verify it is gone.',
            inputSchema: inputSchema.shape,
            annotations: { destructiveHint: true },
        },
        wrapMutationToolHandler<typeof inputSchema.shape>(
            'deletePpskProfile',
            mutationSummary('delete-ppsk-profile', (args) => String(args.profileId)),
            async ({ profileId, siteId, customHeaders, dryRun }) =>
                await runDelete({
                    spec: {
                        label: 'PPSK profile',
                        list: async () => toRecords(await client.getPPSKProfiles(0, siteId, customHeaders)),
                        nameKey: 'profileName',
                    },
                    id: profileId,
                    dryRun,
                    write: () => client.deletePpskProfile(profileId, siteId, customHeaders),
                    warnings: ['Clients using its PSKs can no longer join.'],
                })
        )
    );
}
