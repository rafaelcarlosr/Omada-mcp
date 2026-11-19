import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import type { OmadaClient } from '../omadaClient/index.js';
import { siteInputSchema, wrapMutationToolHandler } from '../server/common.js';
import { refuseBuiltInProfile } from './profileShared.js';
import { dryRunSchema, mutationSummary, runDelete } from './resourceMutationShared.js';

const inputSchema = siteInputSchema.extend({
    profileId: z.string().trim().min(1).describe('APN profile ID from listApnProfiles.'),
    dryRun: dryRunSchema,
});

type Client = Pick<OmadaClient, 'deleteApnProfile' | 'listApnProfiles'>;

export function registerDeleteApnProfileTool(server: McpServer, client: Client): void {
    server.registerTool(
        'deleteApnProfile',
        {
            description:
                'Delete an APN profile. Built-in APN profiles are refused. Defaults to a preview of the record; set dryRun:false to delete and verify it is gone.',
            inputSchema: inputSchema.shape,
            annotations: { destructiveHint: true },
        },
        wrapMutationToolHandler<typeof inputSchema.shape>(
            'deleteApnProfile',
            mutationSummary('delete-apn-profile', (args) => String(args.profileId)),
            async ({ profileId, siteId, customHeaders, dryRun }) =>
                await runDelete({
                    spec: {
                        label: 'APN profile',
                        list: () => client.listApnProfiles(siteId, customHeaders),
                    },
                    id: profileId,
                    dryRun,
                    guard: refuseBuiltInProfile('APN profile'),
                    write: () => client.deleteApnProfile(profileId, siteId, customHeaders),
                    warnings: ['Gateways that use this APN profile can lose their mobile connection; check where it is used first.'],
                })
        )
    );
}
