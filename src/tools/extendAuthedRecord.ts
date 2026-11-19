import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import type { OmadaClient } from '../omadaClient/index.js';
import { siteInputSchema, wrapMutationToolHandler } from '../server/common.js';
import { dryRunSchema, findRecord, mutationSummary, runAction, toRecords } from './resourceMutationShared.js';

const inputSchema = siteInputSchema.extend({
    recordId: z.string().trim().min(1).describe('Authorization record ID from listHotspotAuthRecords.'),
    periodMs: z
        .number()
        .int()
        .min(60_000)
        .max(86_400_000_000_000)
        .describe('New authorization period in milliseconds, from 60000 (1 minute) to 86400000000000.'),
    dryRun: dryRunSchema,
});

type Client = Pick<OmadaClient, 'extendAuthedRecord' | 'listHotspotAuthRecords'>;

export function registerExtendAuthedRecordTool(server: McpServer, client: Client): void {
    server.registerTool(
        'extendAuthedRecord',
        {
            description:
                'Change how long an authorized hotspot client stays authorized. Defaults to a preview of the record; set dryRun:false to apply.',
            inputSchema: inputSchema.shape,
            annotations: { destructiveHint: true },
        },
        wrapMutationToolHandler<typeof inputSchema.shape>(
            'extendAuthedRecord',
            mutationSummary('extend-authed-record', (args) => String(args.recordId)),
            async ({ recordId, periodMs, siteId, customHeaders, dryRun }) =>
                await runAction({
                    label: 'authorization period',
                    dryRun,
                    preflight: async () => {
                        const record = findRecord(toRecords(await client.listHotspotAuthRecords(siteId, customHeaders)), recordId);
                        if (!record) throw new Error(`No authorization record with id "${recordId}" exists. No request was sent.`);
                        return { record, periodMs };
                    },
                    write: () => client.extendAuthedRecord(recordId, periodMs, siteId, customHeaders),
                })
        )
    );
}
