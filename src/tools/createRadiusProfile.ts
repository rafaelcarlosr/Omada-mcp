import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import type { OmadaClient } from '../omadaClient/index.js';
import { createRadiusProfileOpenApiVOSchema } from '../omadaClient/requestSchemas.js';
import { siteInputSchema, wrapMutationToolHandler } from '../server/common.js';
import { checkRadiusProfile } from './authProfileShared.js';
import { dryRunSchema, mutationSummary, runCreate } from './resourceMutationShared.js';

const inputSchema = siteInputSchema.extend({
    payload: createRadiusProfileOpenApiVOSchema.describe(
        'RADIUS profile (official CreateRadiusProfileOpenApiVO): name, authServer [{ radiusServerIp, radiusPort, radiusPwd }], radiusAccountingEnable with optional acctServer, wirelessVlanAssignment, optional CoA.'
    ),
    dryRun: dryRunSchema,
});

type Client = Pick<OmadaClient, 'createRadiusProfile' | 'listRadiusProfiles'>;

export function registerCreateRadiusProfileTool(server: McpServer, client: Client): void {
    server.registerTool(
        'createRadiusProfile',
        {
            description:
                'Create a RADIUS profile for WPA-Enterprise SSIDs, portals or 802.1X. Server passwords are redacted in every response. Defaults to a preview; set dryRun:false to create once and verify by readback.',
            inputSchema: inputSchema.shape,
            annotations: { destructiveHint: true },
        },
        wrapMutationToolHandler<typeof inputSchema.shape>(
            'createRadiusProfile',
            mutationSummary('create-radius-profile', (args) => String((args.payload as { name?: unknown }).name)),
            async ({ payload, siteId, customHeaders, dryRun }) => {
                checkRadiusProfile(payload);
                return await runCreate({
                    spec: { label: 'RADIUS profile', list: () => client.listRadiusProfiles(siteId, customHeaders), idKeys: ['radiusProfileId'] },
                    payload,
                    dryRun,
                    write: () => client.createRadiusProfile(payload, siteId, customHeaders),
                });
            }
        )
    );
}
