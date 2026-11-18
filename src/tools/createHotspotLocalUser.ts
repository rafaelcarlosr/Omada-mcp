import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import type { OmadaClient } from '../omadaClient/index.js';
import { createLocalUserOpenApiVO06Schema } from '../omadaClient/requestSchemas.js';
import { siteInputSchema, wrapMutationToolHandler } from '../server/common.js';
import { withoutPassword } from './hotspotAccountShared.js';
import { dryRunSchema, mutationSummary, runCreate } from './resourceMutationShared.js';

const inputSchema = siteInputSchema.extend({
    payload: createLocalUserOpenApiVO06Schema.describe(
        'Hotspot local user (official CreateLocalUserOpenApiVO): userName (fixed after creation), password, enable, expirationTime (ms), MAC binding, rate limit, traffic limit and portals (or applyToAllPortals:true).'
    ),
    dryRun: dryRunSchema,
});

type Client = Pick<OmadaClient, 'createHotspotLocalUser' | 'listHotspotLocalUsers'>;

export function registerCreateHotspotLocalUserTool(server: McpServer, client: Client): void {
    server.registerTool(
        'createHotspotLocalUser',
        {
            description:
                'Create a hotspot local user account for portal logins. The password is write-only: it is never returned and not verified by readback. Defaults to a preview; set dryRun:false to apply once and verify by readback.',
            inputSchema: inputSchema.shape,
            annotations: { destructiveHint: true },
        },
        wrapMutationToolHandler<typeof inputSchema.shape>(
            'createHotspotLocalUser',
            mutationSummary('create-hotspot-local-user', (args) => String((args.payload as { userName?: unknown }).userName)),
            async ({ payload, siteId, customHeaders, dryRun }) =>
                await runCreate({
                    spec: {
                        label: 'hotspot local user',
                        list: () => client.listHotspotLocalUsers(siteId, customHeaders),
                        nameKey: 'userName',
                        normalize: withoutPassword,
                        writeOnly: ['password'],
                    },
                    payload,
                    dryRun,
                    write: () => client.createHotspotLocalUser(payload, siteId, customHeaders),
                })
        )
    );
}
