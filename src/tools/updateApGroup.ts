import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import type { OmadaClient } from '../omadaClient/index.js';
import { updateApGroupOpenApiVOSchema } from '../omadaClient/requestSchemas.js';
import { siteInputSchema, wrapMutationToolHandler } from '../server/common.js';
import { dryRunSchema, mutationSummary, runUpdate } from './resourceMutationShared.js';

const inputSchema = siteInputSchema.extend({
    apGroupId: z.string().trim().min(1).describe('AP group ID from listApGroups.'),
    payload: updateApGroupOpenApiVOSchema.describe('AP group change (official UpdateApGroupOpenApiVO): name (required), addApMacs, removeApMacs.'),
    dryRun: dryRunSchema,
});

type Client = Pick<OmadaClient, 'listApGroups' | 'updateApGroup'>;

export function registerUpdateApGroupTool(server: McpServer, client: Client): void {
    server.registerTool(
        'updateApGroup',
        {
            description:
                'Rename an AP group and add or remove APs. Moved APs change which SSIDs they broadcast. Defaults to a preview; set dryRun:false to apply once and verify the name by readback.',
            inputSchema: inputSchema.shape,
            annotations: { destructiveHint: true },
        },
        wrapMutationToolHandler<typeof inputSchema.shape>(
            'updateApGroup',
            mutationSummary('update-ap-group', (args) => String(args.apGroupId)),
            async ({ apGroupId, payload, siteId, customHeaders, dryRun }) =>
                await runUpdate({
                    spec: { label: 'AP group', list: () => client.listApGroups(siteId, customHeaders), writeOnly: ['addApMacs', 'removeApMacs'] },
                    id: apGroupId,
                    payload,
                    dryRun,
                    write: () => client.updateApGroup(apGroupId, payload, siteId, customHeaders),
                    ...(payload.addApMacs?.length || payload.removeApMacs?.length
                        ? { warnings: ['Moved APs broadcast the SSIDs of their new group.'] }
                        : {}),
                })
        )
    );
}
