import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import type { OmadaClient } from '../omadaClient/index.js';
import { wifiCallingCopySchema } from '../omadaClient/profiles.js';
import { siteInputSchema, wrapMutationToolHandler } from '../server/common.js';
import { wifiCallingProfiles } from './profileShared.js';
import { dryRunSchema, findRecord, mutationSummary, runCreate, toRecords } from './resourceMutationShared.js';

const inputSchema = siteInputSchema.extend({
    profileId: z.string().trim().min(1).describe('ID of the Wi-Fi calling profile to copy, from listWifiCallingProfiles.'),
    payload: wifiCallingCopySchema.describe('Copy settings (official CopyWifiCallingProfileOpenApiVO): the name of the new profile.'),
    dryRun: dryRunSchema,
});

type Client = Pick<OmadaClient, 'copyWifiCallingProfile' | 'listWifiCallingProfiles'>;

export function registerCopyWifiCallingProfileTool(server: McpServer, client: Client): void {
    server.registerTool(
        'copyWifiCallingProfile',
        {
            description:
                'Copy a Wi-Fi calling profile, carriers and ePDG servers included, under a new name. Defaults to a preview; set dryRun:false to apply once and verify the copy by readback.',
            inputSchema: inputSchema.shape,
            annotations: { destructiveHint: true },
        },
        wrapMutationToolHandler<typeof inputSchema.shape>(
            'copyWifiCallingProfile',
            mutationSummary('copy-wifi-calling-profile', (args) => String(args.profileId)),
            async ({ profileId, payload, siteId, customHeaders, dryRun }) => {
                const list = async (): Promise<unknown[]> => wifiCallingProfiles(await client.listWifiCallingProfiles(siteId, customHeaders));
                const source = findRecord(toRecords(await list()), profileId);
                if (!source) throw new Error(`No Wi-Fi calling profile with id "${profileId}" exists. List them again to get a current id.`);
                const { name: _name, id: _id, resource: _resource, ...copied } = source;
                return await runCreate({
                    spec: { label: 'Wi-Fi calling profile', list },
                    payload: { ...copied, name: payload.name },
                    dryRun,
                    write: () => client.copyWifiCallingProfile(profileId, payload, siteId, customHeaders),
                });
            }
        )
    );
}
