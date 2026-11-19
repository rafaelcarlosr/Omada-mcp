import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import type { OmadaClient } from '../omadaClient/index.js';
import { ouiProfilePayloadSchema } from '../omadaClient/profiles.js';
import { siteInputSchema, wrapMutationToolHandler } from '../server/common.js';
import { dryRunSchema, mutationSummary, runCreate } from './resourceMutationShared.js';

const inputSchema = siteInputSchema.extend({
    payload: ouiProfilePayloadSchema.describe(
        'OUI profile (official OuiProfileOpenApiVO): name and ouiCombine entries { oui like 00-1B-63, description }. OUIs are sent in upper case.'
    ),
    dryRun: dryRunSchema,
});

type Client = Pick<OmadaClient, 'createOuiProfile' | 'getOuiProfileList'>;

export function registerCreateOuiProfileTool(server: McpServer, client: Client): void {
    server.registerTool(
        'createOuiProfile',
        {
            description:
                'Create an OUI profile: a named list of manufacturer OUIs (first three MAC bytes) used by OUI-based VLAN rules, e.g. to put IP phones on a voice VLAN. Defaults to a preview; set dryRun:false to apply once and verify by readback.',
            inputSchema: inputSchema.shape,
            annotations: { destructiveHint: true },
        },
        wrapMutationToolHandler<typeof inputSchema.shape>(
            'createOuiProfile',
            mutationSummary('create-oui-profile', (args) => String((args.payload as { name?: unknown }).name)),
            async ({ payload, siteId, customHeaders, dryRun }) =>
                await runCreate({
                    spec: {
                        label: 'OUI profile',
                        list: () => client.getOuiProfileList(1, 1000, siteId, customHeaders),
                    },
                    payload,
                    dryRun,
                    write: () => client.createOuiProfile(payload, siteId, customHeaders),
                })
        )
    );
}
