import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import type { OmadaClient } from '../omadaClient/index.js';
import { apnProfileConfigSchema } from '../omadaClient/requestSchemas.js';
import { siteInputSchema, wrapMutationToolHandler } from '../server/common.js';
import { refuseBuiltInProfile } from './profileShared.js';
import { dryRunSchema, mutationSummary, runUpdate } from './resourceMutationShared.js';

const inputSchema = siteInputSchema.extend({
    profileId: z.string().trim().min(1).describe('APN profile ID from listApnProfiles.'),
    payload: apnProfileConfigSchema.describe('Complete APN profile (official ApnProfileConfig).'),
    dryRun: dryRunSchema,
});

type Client = Pick<OmadaClient, 'listApnProfiles' | 'updateApnProfile'>;

export function registerUpdateApnProfileTool(server: McpServer, client: Client): void {
    server.registerTool(
        'updateApnProfile',
        {
            description:
                'Replace an APN profile. Built-in APN profiles are refused. Defaults to a preview; set dryRun:false to apply once and verify by readback.',
            inputSchema: inputSchema.shape,
            annotations: { destructiveHint: true },
        },
        wrapMutationToolHandler<typeof inputSchema.shape>(
            'updateApnProfile',
            mutationSummary('update-apn-profile', (args) => String(args.profileId)),
            async ({ profileId, payload, siteId, customHeaders, dryRun }) =>
                await runUpdate({
                    spec: {
                        label: 'APN profile',
                        list: () => client.listApnProfiles(siteId, customHeaders),
                    },
                    id: profileId,
                    payload,
                    dryRun,
                    guard: refuseBuiltInProfile('APN profile'),
                    write: () => client.updateApnProfile(profileId, payload, siteId, customHeaders),
                })
        )
    );
}
