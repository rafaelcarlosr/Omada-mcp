import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import type { OmadaClient } from '../omadaClient/index.js';
import { createApGroupOpenApiVOSchema } from '../omadaClient/requestSchemas.js';
import { siteInputSchema, wrapMutationToolHandler } from '../server/common.js';
import { dryRunSchema, mutationSummary, runCreate } from './resourceMutationShared.js';

const inputSchema = siteInputSchema.extend({
    payload: createApGroupOpenApiVOSchema.describe('AP group (official CreateApGroupOpenApiVO): name and optional apMacs to move into it.'),
    dryRun: dryRunSchema,
});

type Client = Pick<OmadaClient, 'createApGroup' | 'listApGroups'>;

export function registerCreateApGroupTool(server: McpServer, client: Client): void {
    server.registerTool(
        'createApGroup',
        {
            description:
                'Create an AP group, optionally moving APs into it. SSIDs are broadcast per AP group, so moved APs change which SSIDs they serve. Defaults to a preview; set dryRun:false to create once and verify by readback.',
            inputSchema: inputSchema.shape,
            annotations: { destructiveHint: true },
        },
        wrapMutationToolHandler<typeof inputSchema.shape>(
            'createApGroup',
            mutationSummary('create-ap-group', (args) => String((args.payload as { name?: unknown }).name)),
            async ({ payload, siteId, customHeaders, dryRun }) =>
                await runCreate({
                    spec: { label: 'AP group', list: () => client.listApGroups(siteId, customHeaders), writeOnly: ['apMacs'] },
                    payload,
                    dryRun,
                    write: () => client.createApGroup(payload, siteId, customHeaders),
                    ...(payload.apMacs?.length ? { warnings: ['Moved APs broadcast the SSIDs of this group instead of their current one.'] } : {}),
                })
        )
    );
}
