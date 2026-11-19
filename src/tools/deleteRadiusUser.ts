import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import type { OmadaClient } from '../omadaClient/index.js';
import { siteInputSchema, wrapMutationToolHandler } from '../server/common.js';
import { allRadiusUsers, radiusUserRecord } from './authProfileShared.js';
import { dryRunSchema, mutationSummary, runDelete } from './resourceMutationShared.js';

const inputSchema = siteInputSchema.extend({
    userId: z.string().trim().min(1).describe('Built-in RADIUS user ID (userId) from getRadiusUserList.'),
    dryRun: dryRunSchema,
});

type Client = Pick<OmadaClient, 'deleteRadiusUser' | 'getRadiusUserList'>;

export function registerDeleteRadiusUserTool(server: McpServer, client: Client): void {
    server.registerTool(
        'deleteRadiusUser',
        {
            description:
                'Delete a user of the built-in RADIUS server; clients using it can no longer authenticate. Defaults to a preview; set dryRun:false to delete and verify it is gone.',
            inputSchema: inputSchema.shape,
            annotations: { destructiveHint: true },
        },
        wrapMutationToolHandler<typeof inputSchema.shape>(
            'deleteRadiusUser',
            mutationSummary('delete-radius-user', (args) => String(args.userId)),
            async ({ userId, siteId, customHeaders, dryRun }) =>
                await runDelete({
                    spec: {
                        label: 'RADIUS user',
                        list: () => allRadiusUsers(client, siteId, customHeaders),
                        idKeys: ['userId'],
                        nameKey: null,
                        normalize: radiusUserRecord,
                    },
                    id: userId,
                    dryRun,
                    write: () => client.deleteRadiusUser(userId, siteId, customHeaders),
                    warnings: ['Clients using this account can no longer authenticate.'],
                })
        )
    );
}
