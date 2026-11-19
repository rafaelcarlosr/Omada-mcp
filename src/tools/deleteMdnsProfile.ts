import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import type { OmadaClient } from '../omadaClient/index.js';
import { siteInputSchema, wrapMutationToolHandler } from '../server/common.js';
import { refuseBuiltInProfile } from './profileShared.js';
import { dryRunSchema, mutationSummary, runDelete } from './resourceMutationShared.js';

const inputSchema = siteInputSchema.extend({
    profileId: z.string().trim().min(1).describe('Bonjour service ID from listMdnsProfile.'),
    dryRun: dryRunSchema,
});

type Client = Pick<OmadaClient, 'deleteMdnsProfile' | 'listMdnsProfile'>;

export function registerDeleteMdnsProfileTool(server: McpServer, client: Client): void {
    server.registerTool(
        'deleteMdnsProfile',
        {
            description:
                'Delete a Bonjour service. Built-in services are refused. Defaults to a preview of the record; set dryRun:false to delete and verify it is gone.',
            inputSchema: inputSchema.shape,
            annotations: { destructiveHint: true },
        },
        wrapMutationToolHandler<typeof inputSchema.shape>(
            'deleteMdnsProfile',
            mutationSummary('delete-mdns-profile', (args) => String(args.profileId)),
            async ({ profileId, siteId, customHeaders, dryRun }) =>
                await runDelete({
                    spec: {
                        label: 'Bonjour service',
                        list: () => client.listMdnsProfile(siteId, customHeaders),
                    },
                    id: profileId,
                    dryRun,
                    guard: refuseBuiltInProfile('Bonjour service'),
                    write: () => client.deleteMdnsProfile(profileId, siteId, customHeaders),
                    warnings: ['mDNS forwarding rules that use this service stop forwarding it; check where it is used first.'],
                })
        )
    );
}
