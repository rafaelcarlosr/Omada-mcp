import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import type { OmadaClient } from '../omadaClient/index.js';
import { createRadiusUserOpenApiVOSchema } from '../omadaClient/requestSchemas.js';
import { siteInputSchema, wrapMutationToolHandler } from '../server/common.js';
import { allRadiusUsers, radiusUserRecord } from './authProfileShared.js';
import { dryRunSchema, mutationSummary, runCreate } from './resourceMutationShared.js';

const inputSchema = siteInputSchema.extend({
    payload: createRadiusUserOpenApiVOSchema.describe(
        'Built-in RADIUS user (official CreateRadiusUserOpenApiVO): type 0 with userInfo { username, password }, or type 1 (MAC auth) with macAddress; optional rate and traffic limits, vlanId, timeout, description.'
    ),
    dryRun: dryRunSchema,
});

type Client = Pick<OmadaClient, 'createRadiusUser' | 'getRadiusUserList'>;

export function registerCreateRadiusUserTool(server: McpServer, client: Client): void {
    server.registerTool(
        'createRadiusUser',
        {
            description:
                'Create a user of the built-in RADIUS server. Passwords are redacted in every response. Defaults to a preview; set dryRun:false to create once and verify by readback.',
            inputSchema: inputSchema.shape,
            annotations: { destructiveHint: true },
        },
        wrapMutationToolHandler<typeof inputSchema.shape>(
            'createRadiusUser',
            mutationSummary('create-radius-user', (args) =>
                String((args.payload as { userInfo?: { username?: unknown } }).userInfo?.username ?? 'mac-user')
            ),
            async ({ payload, siteId, customHeaders, dryRun }) => {
                const username = payload.userInfo?.username;
                if (username !== undefined && (await allRadiusUsers(client, siteId, customHeaders)).some((user) => user.username === username)) {
                    throw new Error(`A RADIUS user named "${username}" already exists. No request was sent.`);
                }
                return await runCreate({
                    spec: {
                        label: 'RADIUS user',
                        list: () => allRadiusUsers(client, siteId, customHeaders),
                        idKeys: ['userId'],
                        nameKey: null,
                        normalize: radiusUserRecord,
                    },
                    payload,
                    dryRun,
                    write: () => client.createRadiusUser(payload, siteId, customHeaders),
                });
            }
        )
    );
}
