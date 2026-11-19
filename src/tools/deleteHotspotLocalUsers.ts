import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import type { OmadaClient } from '../omadaClient/index.js';
import { siteInputSchema, wrapMutationToolHandler } from '../server/common.js';
import { withoutPassword } from './hotspotAccountShared.js';
import { dryRunSchema, mutationSummary, runBatchDelete } from './resourceMutationShared.js';

const inputSchema = siteInputSchema.extend({
    userIds: z.array(z.string().trim().min(1)).min(1).max(1000).describe('Local user IDs from listHotspotLocalUsers.'),
    dryRun: dryRunSchema,
});

type Client = Pick<OmadaClient, 'deleteHotspotLocalUsers' | 'listHotspotLocalUsers'>;

export function registerDeleteHotspotLocalUsersTool(server: McpServer, client: Client): void {
    server.registerTool(
        'deleteHotspotLocalUsers',
        {
            description:
                'Delete several hotspot local users in one request. Only the listed IDs are deleted. Defaults to a preview; set dryRun:false to delete and verify they are gone.',
            inputSchema: inputSchema.shape,
            annotations: { destructiveHint: true },
        },
        wrapMutationToolHandler<typeof inputSchema.shape>(
            'deleteHotspotLocalUsers',
            mutationSummary('delete-hotspot-local-users', (args) => (args.userIds as string[]).join(',')),
            async ({ userIds, siteId, customHeaders, dryRun }) =>
                await runBatchDelete({
                    spec: {
                        label: 'hotspot local user',
                        list: () => client.listHotspotLocalUsers(siteId, customHeaders),
                        normalize: withoutPassword,
                    },
                    ids: userIds,
                    dryRun,
                    write: () => client.deleteHotspotLocalUsers(userIds, siteId, customHeaders),
                    warnings: ['These users can no longer pass the portal; connected sessions end when they expire.'],
                })
        )
    );
}
