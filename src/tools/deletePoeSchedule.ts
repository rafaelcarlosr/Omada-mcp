import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import type { OmadaClient } from '../omadaClient/index.js';
import { siteInputSchema, wrapMutationToolHandler } from '../server/common.js';
import { dryRunSchema, mutationSummary, runDelete } from './resourceMutationShared.js';

const inputSchema = siteInputSchema.extend({
    poeScheduleId: z.string().trim().min(1).describe('PoE schedule ID from listPoeSchedules.'),
    dryRun: dryRunSchema,
});

type Client = Pick<OmadaClient, 'deletePoeSchedule' | 'listPoeSchedules'>;

export function registerDeletePoeScheduleTool(server: McpServer, client: Client): void {
    server.registerTool(
        'deletePoeSchedule',
        {
            description:
                'Delete a PoE schedule; its ports stay powered all the time. Defaults to a preview of the record; set dryRun:false to delete and verify it is gone.',
            inputSchema: inputSchema.shape,
            annotations: { destructiveHint: true },
        },
        wrapMutationToolHandler<typeof inputSchema.shape>(
            'deletePoeSchedule',
            mutationSummary('delete-poe-schedule', (args) => String(args.poeScheduleId)),
            async ({ poeScheduleId, siteId, customHeaders, dryRun }) =>
                await runDelete({
                    spec: {
                        label: 'PoE schedule',
                        list: () => client.listPoeSchedules(siteId, customHeaders),
                    },
                    id: poeScheduleId,
                    dryRun,
                    write: () => client.deletePoeSchedule(poeScheduleId, siteId, customHeaders),
                    warnings: ['The ports return to always-on PoE.'],
                })
        )
    );
}
