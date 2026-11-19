import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { OmadaClient } from '../omadaClient/index.js';
import { deleteFilterInfo06Schema } from '../omadaClient/requestSchemas.js';
import { siteInputSchema, wrapMutationToolHandler } from '../server/common.js';
import { dryRunSchema, mutationSummary, runAction } from './resourceMutationShared.js';

const inputSchema = siteInputSchema.extend({
    payload: deleteFilterInfo06Schema
        .refine((value) => value.start < value.end, 'start must be before end.')
        .describe(
            'Filter (official Delete Filter Info): start and end in epoch seconds, optional searchKey on client MAC, client name, SSID or network.'
        ),
    dryRun: dryRunSchema,
});

type Client = Pick<OmadaClient, 'deleteExpiredAuthedRecords'>;

export function registerDeleteExpiredAuthedRecordsTool(server: McpServer, client: Client): void {
    server.registerTool(
        'deleteExpiredAuthedRecords',
        {
            description:
                'Delete the expired (invalid) hotspot authorization records of a period, optionally filtered by client, SSID or network. Valid authorizations stay. Defaults to a preview; set dryRun:false to delete.',
            inputSchema: inputSchema.shape,
            annotations: { destructiveHint: true },
        },
        wrapMutationToolHandler<typeof inputSchema.shape>(
            'deleteExpiredAuthedRecords',
            mutationSummary('delete-expired-authed-records', (args) => args.siteId ?? 'default-site'),
            async ({ payload, siteId, customHeaders, dryRun }) =>
                await runAction({
                    label: 'expired authorization cleanup',
                    dryRun,
                    preflight: async () => ({ ...payload }),
                    write: () => client.deleteExpiredAuthedRecords(payload, siteId, customHeaders),
                    warnings: ['Expired authorization records of the period are deleted from the history.'],
                })
        )
    );
}
