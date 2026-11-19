import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import type { OmadaClient } from '../omadaClient/index.js';
import { ouiProfilePayloadSchema } from '../omadaClient/profiles.js';
import { siteInputSchema, wrapMutationToolHandler } from '../server/common.js';
import { dryRunSchema, mutationSummary, runUpdate } from './resourceMutationShared.js';

const inputSchema = siteInputSchema.extend({
    ouiId: z.string().trim().min(1).describe('OUI profile ID from getOuiProfileList.'),
    payload: ouiProfilePayloadSchema.describe('Complete OUI profile (official OuiProfileOpenApiVO).'),
    dryRun: dryRunSchema,
});

type Client = Pick<OmadaClient, 'getOuiProfileList' | 'updateOuiProfile'>;

export function registerUpdateOuiProfileTool(server: McpServer, client: Client): void {
    server.registerTool(
        'updateOuiProfile',
        {
            description: 'Replace the name and OUIs of an OUI profile. Defaults to a preview; set dryRun:false to apply once and verify by readback.',
            inputSchema: inputSchema.shape,
            annotations: { destructiveHint: true },
        },
        wrapMutationToolHandler<typeof inputSchema.shape>(
            'updateOuiProfile',
            mutationSummary('update-oui-profile', (args) => String(args.ouiId)),
            async ({ ouiId, payload, siteId, customHeaders, dryRun }) =>
                await runUpdate({
                    spec: {
                        label: 'OUI profile',
                        list: () => client.getOuiProfileList(1, 1000, siteId, customHeaders),
                    },
                    id: ouiId,
                    payload,
                    dryRun,
                    write: () => client.updateOuiProfile(ouiId, payload, siteId, customHeaders),
                })
        )
    );
}
