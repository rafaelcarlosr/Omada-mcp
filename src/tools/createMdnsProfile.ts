import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import type { OmadaClient } from '../omadaClient/index.js';
import { bonjourServicePayloadSchema } from '../omadaClient/profiles.js';
import { siteInputSchema, wrapMutationToolHandler } from '../server/common.js';
import { dryRunSchema, mutationSummary, runCreate } from './resourceMutationShared.js';

const inputSchema = siteInputSchema.extend({
    payload: bonjourServicePayloadSchema.describe(
        'Bonjour service (official BonjourServiceOpenApiVO): name and 1-3 serviceIds such as _airplay._tcp.local.'
    ),
    dryRun: dryRunSchema,
});

type Client = Pick<OmadaClient, 'createMdnsProfile' | 'listMdnsProfile'>;

export function registerCreateMdnsProfileTool(server: McpServer, client: Client): void {
    server.registerTool(
        'createMdnsProfile',
        {
            description:
                'Create a Bonjour (mDNS) service profile with up to three service IDs, for use in mDNS forwarding rules. Defaults to a preview; set dryRun:false to apply once and verify by readback.',
            inputSchema: inputSchema.shape,
            annotations: { destructiveHint: true },
        },
        wrapMutationToolHandler<typeof inputSchema.shape>(
            'createMdnsProfile',
            mutationSummary('create-mdns-profile', (args) => String((args.payload as { name?: unknown }).name)),
            async ({ payload, siteId, customHeaders, dryRun }) =>
                await runCreate({
                    spec: {
                        label: 'Bonjour service',
                        list: () => client.listMdnsProfile(siteId, customHeaders),
                    },
                    payload,
                    dryRun,
                    write: () => client.createMdnsProfile(payload, siteId, customHeaders),
                })
        )
    );
}
