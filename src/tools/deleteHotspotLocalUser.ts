import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import type { OmadaClient } from '../omadaClient/index.js';
import { siteInputSchema, wrapMutationToolHandler } from '../server/common.js';
import { withoutPassword } from './hotspotAccountShared.js';
import { dryRunSchema, mutationSummary, runDelete } from './resourceMutationShared.js';

const inputSchema = siteInputSchema.extend({
    userId: z.string().trim().min(1).describe('Local user ID from listHotspotLocalUsers.'),
    dryRun: dryRunSchema,
});

type Client = Pick<OmadaClient, 'deleteHotspotLocalUser' | 'listHotspotLocalUsers'>;

export function registerDeleteHotspotLocalUserTool(server: McpServer, client: Client): void {
    server.registerTool(
        'deleteHotspotLocalUser',
        {
            description:
                'Delete a hotspot local user; clients signed in with it lose portal access at re-authentication. Defaults to a preview of the record; set dryRun:false to delete and verify it is gone.',
            inputSchema: inputSchema.shape,
            annotations: { destructiveHint: true },
        },
        wrapMutationToolHandler<typeof inputSchema.shape>(
            'deleteHotspotLocalUser',
            mutationSummary('delete-hotspot-local-user', (args) => String(args.userId)),
            async ({ userId, siteId, customHeaders, dryRun }) =>
                await runDelete({
                    spec: {
                        label: 'hotspot local user',
                        list: () => client.listHotspotLocalUsers(siteId, customHeaders),
                        nameKey: null,
                        normalize: withoutPassword,
                        writeOnly: ['password'],
                    },
                    id: userId,
                    dryRun,
                    write: () => client.deleteHotspotLocalUser(userId, siteId, customHeaders),
                })
        )
    );
}
