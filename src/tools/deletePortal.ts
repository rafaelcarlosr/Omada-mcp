import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import type { OmadaClient } from '../omadaClient/index.js';
import { siteInputSchema, wrapMutationToolHandler } from '../server/common.js';
import { dryRunSchema, mutationSummary, runDelete, toRecords } from './resourceMutationShared.js';

const inputSchema = siteInputSchema.extend({
    portalId: z.string().trim().min(1).describe('Portal ID from getPortalProfile.'),
    dryRun: dryRunSchema,
});

type Client = Pick<OmadaClient, 'deletePortal' | 'getPortalProfile'>;

export function registerDeletePortalTool(server: McpServer, client: Client): void {
    server.registerTool(
        'deletePortal',
        {
            description:
                'Delete a captive portal; its SSIDs and networks no longer require it. Defaults to a preview; set dryRun:false to delete and verify it is gone.',
            inputSchema: inputSchema.shape,
            annotations: { destructiveHint: true },
        },
        wrapMutationToolHandler<typeof inputSchema.shape>(
            'deletePortal',
            mutationSummary('delete-portal', (args) => String(args.portalId)),
            async ({ portalId, siteId, customHeaders, dryRun }) =>
                await runDelete({
                    spec: { label: 'portal', list: async () => toRecords(await client.getPortalProfile(siteId, customHeaders)) },
                    id: portalId,
                    dryRun,
                    write: () => client.deletePortal(portalId, siteId, customHeaders),
                    warnings: ['Clients on its SSIDs and networks get access without the portal.'],
                })
        )
    );
}
