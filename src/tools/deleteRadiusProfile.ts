import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import type { OmadaClient } from '../omadaClient/index.js';
import { siteInputSchema, wrapMutationToolHandler } from '../server/common.js';
import { refuseBuiltInRadiusProfile } from './authProfileShared.js';
import { dryRunSchema, mutationSummary, runDelete } from './resourceMutationShared.js';

const inputSchema = siteInputSchema.extend({
    radiusProfileId: z.string().trim().min(1).describe('RADIUS profile ID (radiusProfileId) from listRadiusProfiles.'),
    dryRun: dryRunSchema,
});

type Client = Pick<OmadaClient, 'deleteRadiusProfile' | 'listRadiusProfiles'>;

export function registerDeleteRadiusProfileTool(server: McpServer, client: Client): void {
    server.registerTool(
        'deleteRadiusProfile',
        {
            description:
                'Delete a RADIUS profile. The built-in profile is refused; the controller refuses profiles still used by an SSID or portal. Defaults to a preview; set dryRun:false to delete and verify it is gone.',
            inputSchema: inputSchema.shape,
            annotations: { destructiveHint: true },
        },
        wrapMutationToolHandler<typeof inputSchema.shape>(
            'deleteRadiusProfile',
            mutationSummary('delete-radius-profile', (args) => String(args.radiusProfileId)),
            async ({ radiusProfileId, siteId, customHeaders, dryRun }) =>
                await runDelete({
                    spec: { label: 'RADIUS profile', list: () => client.listRadiusProfiles(siteId, customHeaders), idKeys: ['radiusProfileId'] },
                    id: radiusProfileId,
                    dryRun,
                    guard: refuseBuiltInRadiusProfile,
                    write: () => client.deleteRadiusProfile(radiusProfileId, siteId, customHeaders),
                })
        )
    );
}
