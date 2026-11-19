import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import type { OmadaClient } from '../omadaClient/index.js';
import { lanMulticastPayloadSchema } from '../omadaClient/lanServices.js';
import { siteInputSchema, wrapMutationToolHandler } from '../server/common.js';
import { pickBySchema } from './authProfileShared.js';
import { dryRunSchema, findRecord, mutationSummary, type RecordLike, runUpdate, toRecords } from './resourceMutationShared.js';

const inputSchema = siteInputSchema.extend({
    multicastId: z.string().trim().min(1).describe('Multicast configuration ID from listLanMulticasts.'),
    changes: lanMulticastPayloadSchema
        .partial()
        .refine((value) => Object.keys(value).length > 0, 'At least one change is required.')
        .describe('Fields to change; the others keep their current values.'),
    dryRun: dryRunSchema,
});

type Client = Pick<OmadaClient, 'listLanMulticasts' | 'updateLanMulticast'>;

export function registerUpdateLanMulticastTool(server: McpServer, client: Client): void {
    server.registerTool(
        'updateLanMulticast',
        {
            description:
                'Change a multicast snooping configuration. Only the listed fields change; the controller needs the complete configuration, so the rest comes from the current one. Defaults to a preview; set dryRun:false to apply once and verify by readback.',
            inputSchema: inputSchema.shape,
            annotations: { destructiveHint: true },
        },
        wrapMutationToolHandler<typeof inputSchema.shape>(
            'updateLanMulticast',
            mutationSummary('update-lan-multicast', (args) => String(args.multicastId)),
            async ({ multicastId, changes, siteId, customHeaders, dryRun }) => {
                const current = findRecord(toRecords(await client.listLanMulticasts(siteId, customHeaders)), multicastId);
                if (!current) throw new Error(`No LAN multicast with id "${multicastId}" exists. List them again to get a current id.`);
                const payload = lanMulticastPayloadSchema.parse({ ...(pickBySchema(lanMulticastPayloadSchema, current) as RecordLike), ...changes });
                return await runUpdate({
                    spec: { label: 'LAN multicast', list: () => client.listLanMulticasts(siteId, customHeaders) },
                    id: multicastId,
                    payload: payload as RecordLike,
                    dryRun,
                    write: () => client.updateLanMulticast(multicastId, payload, siteId, customHeaders),
                });
            }
        )
    );
}
