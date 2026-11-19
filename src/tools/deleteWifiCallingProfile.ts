import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import type { OmadaClient } from '../omadaClient/index.js';
import { siteInputSchema, wrapMutationToolHandler } from '../server/common.js';
import { wifiCallingProfiles } from './profileShared.js';
import { dryRunSchema, mutationSummary, runDelete } from './resourceMutationShared.js';

const inputSchema = siteInputSchema.extend({
    profileId: z.string().trim().min(1).describe('Wi-Fi calling profile ID from listWifiCallingProfiles.'),
    dryRun: dryRunSchema,
});

type Client = Pick<OmadaClient, 'deleteWifiCallingProfile' | 'listWifiCallingProfiles'>;

export function registerDeleteWifiCallingProfileTool(server: McpServer, client: Client): void {
    server.registerTool(
        'deleteWifiCallingProfile',
        {
            description: 'Delete a Wi-Fi calling profile. Defaults to a preview of the record; set dryRun:false to delete and verify it is gone.',
            inputSchema: inputSchema.shape,
            annotations: { destructiveHint: true },
        },
        wrapMutationToolHandler<typeof inputSchema.shape>(
            'deleteWifiCallingProfile',
            mutationSummary('delete-wifi-calling-profile', (args) => String(args.profileId)),
            async ({ profileId, siteId, customHeaders, dryRun }) =>
                await runDelete({
                    spec: {
                        label: 'Wi-Fi calling profile',
                        list: async () => wifiCallingProfiles(await client.listWifiCallingProfiles(siteId, customHeaders)),
                    },
                    id: profileId,
                    dryRun,
                    write: () => client.deleteWifiCallingProfile(profileId, siteId, customHeaders),
                    warnings: ['SSIDs that use this profile stop prioritizing Wi-Fi calling traffic; check where it is used first.'],
                })
        )
    );
}
