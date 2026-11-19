import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import type { OmadaClient } from '../omadaClient/index.js';
import { createRadiusUserOpenApiVOSchema, radiusUserInfoOpenApiVOSchema } from '../omadaClient/requestSchemas.js';
import { siteInputSchema, wrapMutationToolHandler } from '../server/common.js';
import { allRadiusUsers, radiusUserRecord, radiusUserRequest } from './authProfileShared.js';
import { dryRunSchema, findRecord, mutationSummary, type RecordLike, runUpdate } from './resourceMutationShared.js';

const inputSchema = siteInputSchema.extend({
    userId: z.string().trim().min(1).describe('Built-in RADIUS user ID (userId) from getRadiusUserList.'),
    changes: createRadiusUserOpenApiVOSchema
        .partial()
        .extend({ userInfo: radiusUserInfoOpenApiVOSchema.partial().optional() })
        .refine((value) => Object.keys(value).length > 0, 'At least one change is required.')
        .describe('Fields to change; the others, the password included, keep their current values.'),
    dryRun: dryRunSchema,
});

type Client = Pick<OmadaClient, 'getRadiusUserList' | 'updateRadiusUser'>;

export function registerUpdateRadiusUserTool(server: McpServer, client: Client): void {
    server.registerTool(
        'updateRadiusUser',
        {
            description:
                'Change a user of the built-in RADIUS server. Only the listed fields change; the controller needs the complete user, so the rest, the password included, is taken from the current user. Defaults to a preview; set dryRun:false to apply once and verify by readback.',
            inputSchema: inputSchema.shape,
            annotations: { destructiveHint: true },
        },
        wrapMutationToolHandler<typeof inputSchema.shape>(
            'updateRadiusUser',
            mutationSummary('update-radius-user', (args) => String(args.userId)),
            async ({ userId, changes, siteId, customHeaders, dryRun }) => {
                const users = await allRadiusUsers(client, siteId, customHeaders);
                const current = findRecord(users, userId, ['userId']);
                if (!current) throw new Error(`No RADIUS user with id "${userId}" exists. List them again to get a current id.`);
                const base = radiusUserRequest(current);
                const userInfo =
                    base.userInfo || changes.userInfo ? { ...(base.userInfo as RecordLike | undefined), ...changes.userInfo } : undefined;
                if (userInfo && users.some((user) => user.userId !== userId && user.username === userInfo.username)) {
                    throw new Error(`A RADIUS user named "${String(userInfo.username)}" already exists. No request was sent.`);
                }
                const payload = createRadiusUserOpenApiVOSchema.parse({ ...base, ...changes, ...(userInfo ? { userInfo } : {}) });
                return await runUpdate({
                    spec: {
                        label: 'RADIUS user',
                        list: () => allRadiusUsers(client, siteId, customHeaders),
                        idKeys: ['userId'],
                        nameKey: null,
                        normalize: radiusUserRecord,
                    },
                    id: userId,
                    payload: payload as RecordLike,
                    dryRun,
                    write: () => client.updateRadiusUser(userId, payload, siteId, customHeaders),
                });
            }
        )
    );
}
