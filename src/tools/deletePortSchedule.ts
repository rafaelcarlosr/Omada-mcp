import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import type { OmadaClient } from '../omadaClient/index.js';
import { siteInputSchema, wrapMutationToolHandler } from '../server/common.js';
import { dryRunSchema, mutationSummary, runDelete } from './resourceMutationShared.js';

const inputSchema = siteInputSchema.extend({
    scheduleId: z.string().trim().min(1).describe('Port schedule ID from getPortScheduleList.'),
    dryRun: dryRunSchema,
});

type Client = Pick<OmadaClient, 'deletePortSchedule' | 'listPortSchedules'>;

export function registerDeletePortScheduleTool(server: McpServer, client: Client): void {
    server.registerTool(
        'deletePortSchedule',
        {
            description:
                'Delete a port schedule; its ports stay in their current state and are no longer switched by time. Defaults to a preview of the record; set dryRun:false to delete and verify it is gone.',
            inputSchema: inputSchema.shape,
            annotations: { destructiveHint: true },
        },
        wrapMutationToolHandler<typeof inputSchema.shape>(
            'deletePortSchedule',
            mutationSummary('delete-port-schedule', (args) => String(args.scheduleId)),
            async ({ scheduleId, siteId, customHeaders, dryRun }) =>
                await runDelete({
                    spec: {
                        label: 'port schedule',
                        list: () => client.listPortSchedules(siteId, customHeaders),
                    },
                    id: scheduleId,
                    dryRun,
                    write: () => client.deletePortSchedule(scheduleId, siteId, customHeaders),
                })
        )
    );
}
