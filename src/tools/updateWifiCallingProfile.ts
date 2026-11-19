import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import type { OmadaClient } from '../omadaClient/index.js';
import { wifiCallingProfilePayloadSchema } from '../omadaClient/profiles.js';
import { siteInputSchema, wrapMutationToolHandler } from '../server/common.js';
import { wifiCallingProfiles } from './profileShared.js';
import { dryRunSchema, mutationSummary, runUpdate } from './resourceMutationShared.js';

const inputSchema = siteInputSchema.extend({
    profileId: z.string().trim().min(1).describe('Wi-Fi calling profile ID from listWifiCallingProfiles.'),
    payload: wifiCallingProfilePayloadSchema.describe('Complete Wi-Fi calling profile (official CreateWifiCallingProfileOpenApiVO).'),
    dryRun: dryRunSchema,
});

type Client = Pick<OmadaClient, 'listWifiCallingProfiles' | 'updateWifiCallingProfile'>;

export function registerUpdateWifiCallingProfileTool(server: McpServer, client: Client): void {
    server.registerTool(
        'updateWifiCallingProfile',
        {
            description:
                'Replace the name, description and carriers of a Wi-Fi calling profile. Defaults to a preview; set dryRun:false to apply once and verify by readback.',
            inputSchema: inputSchema.shape,
            annotations: { destructiveHint: true },
        },
        wrapMutationToolHandler<typeof inputSchema.shape>(
            'updateWifiCallingProfile',
            mutationSummary('update-wifi-calling-profile', (args) => String(args.profileId)),
            async ({ profileId, payload, siteId, customHeaders, dryRun }) =>
                await runUpdate({
                    spec: {
                        label: 'Wi-Fi calling profile',
                        list: async () => wifiCallingProfiles(await client.listWifiCallingProfiles(siteId, customHeaders)),
                    },
                    id: profileId,
                    payload,
                    dryRun,
                    write: () => client.updateWifiCallingProfile(profileId, payload, siteId, customHeaders),
                })
        )
    );
}
