import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import type { OmadaClient } from '../omadaClient/index.js';
import { modifyLocalUserOpenApiVO06Schema } from '../omadaClient/requestSchemas.js';
import { siteInputSchema, wrapMutationToolHandler } from '../server/common.js';
import { withoutPassword } from './hotspotAccountShared.js';
import { dryRunSchema, mutationSummary, runUpdate } from './resourceMutationShared.js';

const inputSchema = siteInputSchema.extend({
    userId: z.string().trim().min(1).describe('Local user ID from listHotspotLocalUsers.'),
    payload: modifyLocalUserOpenApiVO06Schema.describe(
        'Complete local user (official ModifyLocalUserOpenApiVO). The password is required by the controller on every modification.'
    ),
    dryRun: dryRunSchema,
});

type Client = Pick<OmadaClient, 'listHotspotLocalUsers' | 'updateHotspotLocalUser'>;

export function registerUpdateHotspotLocalUserTool(server: McpServer, client: Client): void {
    server.registerTool(
        'updateHotspotLocalUser',
        {
            description:
                'Replace a hotspot local user (enable, expiry, password, limits, portals). The username cannot change, and the controller requires at least one portal ID in portals (applyToAllPortals alone is rejected with -42037). Defaults to a preview; set dryRun:false to apply once and verify by readback.',
            inputSchema: inputSchema.shape,
            annotations: { destructiveHint: true },
        },
        wrapMutationToolHandler<typeof inputSchema.shape>(
            'updateHotspotLocalUser',
            mutationSummary('update-hotspot-local-user', (args) => String(args.userId)),
            async ({ userId, payload, siteId, customHeaders, dryRun }) =>
                await runUpdate({
                    spec: {
                        label: 'hotspot local user',
                        list: () => client.listHotspotLocalUsers(siteId, customHeaders),
                        nameKey: null,
                        normalize: withoutPassword,
                        writeOnly: ['password'],
                    },
                    id: userId,
                    payload,
                    dryRun,
                    write: () => client.updateHotspotLocalUser(userId, payload, siteId, customHeaders),
                })
        )
    );
}
