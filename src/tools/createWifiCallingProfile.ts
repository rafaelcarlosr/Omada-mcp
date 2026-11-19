import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import type { OmadaClient } from '../omadaClient/index.js';
import { wifiCallingProfilePayloadSchema } from '../omadaClient/profiles.js';
import { siteInputSchema, wrapMutationToolHandler } from '../server/common.js';
import { wifiCallingProfiles } from './profileShared.js';
import { dryRunSchema, mutationSummary, runCreate } from './resourceMutationShared.js';

const inputSchema = siteInputSchema.extend({
    payload: wifiCallingProfilePayloadSchema.describe(
        'Wi-Fi calling profile (official CreateWifiCallingProfileOpenApiVO): name, optional description and carrierList of { carrierName, epdgs: [{ qosPriority, type 0 domain or 1 IP, domain or ip }] }.'
    ),
    dryRun: dryRunSchema,
});

type Client = Pick<OmadaClient, 'createWifiCallingProfile' | 'listWifiCallingProfiles'>;

export function registerCreateWifiCallingProfileTool(server: McpServer, client: Client): void {
    server.registerTool(
        'createWifiCallingProfile',
        {
            description:
                'Create a Wi-Fi calling profile: carriers and their ePDG servers (domain or IP with QoS priority) that SSIDs can prioritize. Defaults to a preview; set dryRun:false to apply once and verify by readback.',
            inputSchema: inputSchema.shape,
            annotations: { destructiveHint: true },
        },
        wrapMutationToolHandler<typeof inputSchema.shape>(
            'createWifiCallingProfile',
            mutationSummary('create-wifi-calling-profile', (args) => String((args.payload as { name?: unknown }).name)),
            async ({ payload, siteId, customHeaders, dryRun }) =>
                await runCreate({
                    spec: {
                        label: 'Wi-Fi calling profile',
                        list: async () => wifiCallingProfiles(await client.listWifiCallingProfiles(siteId, customHeaders)),
                    },
                    payload,
                    dryRun,
                    write: () => client.createWifiCallingProfile(payload, siteId, customHeaders),
                })
        )
    );
}
