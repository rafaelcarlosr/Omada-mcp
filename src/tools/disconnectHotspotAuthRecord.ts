import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import type { OmadaClient } from '../omadaClient/index.js';
import { siteInputSchema, wrapMutationToolHandler } from '../server/common.js';
import { dryRunSchema, findRecord, mutationSummary, runAction, toRecords } from './resourceMutationShared.js';

const inputSchema = siteInputSchema.extend({
    recordId: z.string().trim().min(1).describe('Authentication record ID from listHotspotAuthRecords.'),
    dryRun: dryRunSchema,
});

type Client = Pick<OmadaClient, 'disconnectHotspotAuthRecord' | 'listHotspotAuthRecords'>;

export function registerDisconnectHotspotAuthRecordTool(server: McpServer, client: Client): void {
    server.registerTool(
        'disconnectHotspotAuthRecord',
        {
            description:
                'Disconnect a hotspot-authenticated client session; the client must authenticate again on the portal. Defaults to a preview of the session; set dryRun:false to send the disconnect once.',
            inputSchema: inputSchema.shape,
            annotations: { destructiveHint: true },
        },
        wrapMutationToolHandler<typeof inputSchema.shape>(
            'disconnectHotspotAuthRecord',
            mutationSummary('disconnect-hotspot-auth-record', (args) => String(args.recordId)),
            async ({ recordId, siteId, customHeaders, dryRun }) =>
                await runAction({
                    label: 'hotspot disconnect',
                    dryRun,
                    preflight: async () => {
                        const record = findRecord(toRecords(await client.listHotspotAuthRecords(siteId, customHeaders)), recordId);
                        if (!record)
                            throw new Error(`No hotspot authentication record with id "${recordId}" exists. List them again to get a current id.`);
                        return record;
                    },
                    write: () => client.disconnectHotspotAuthRecord(recordId, siteId, customHeaders),
                })
        )
    );
}
