import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import type { OmadaClient } from '../omadaClient/index.js';
import { portScheduleOpenApiVOSchema } from '../omadaClient/requestSchemas.js';
import { siteInputSchema, wrapMutationToolHandler } from '../server/common.js';
import { dryRunSchema, mutationSummary, runUpdate } from './resourceMutationShared.js';

/** The spec types portsMap as a bare object; its documented shape is switch MAC -> port numbers. */
const portScheduleSchema = portScheduleOpenApiVOSchema.extend({
    portsMap: z.record(z.string(), z.array(z.number().int().min(1))).describe('Switch MAC -> list of port numbers covered by the schedule.'),
});

const inputSchema = siteInputSchema.extend({
    scheduleId: z.string().trim().min(1).describe('Port schedule ID from getPortScheduleList.'),
    payload: portScheduleSchema.describe(
        'Port schedule (official PortScheduleOpenApiVO): name, status, turnOnTime = time range profile ID, and portsMap from switch MAC to the port numbers it powers on.'
    ),
    dryRun: dryRunSchema,
});

type Client = Pick<OmadaClient, 'listPortSchedules' | 'updatePortSchedule'>;

export function registerUpdatePortScheduleTool(server: McpServer, client: Client): void {
    server.registerTool(
        'updatePortSchedule',
        {
            description:
                'Replace a port schedule (status, time range or covered ports). Ports leaving or joining the schedule change state at the next window. Defaults to a preview; set dryRun:false to apply once and verify by readback.',
            inputSchema: inputSchema.shape,
            annotations: { destructiveHint: true },
        },
        wrapMutationToolHandler<typeof inputSchema.shape>(
            'updatePortSchedule',
            mutationSummary('update-port-schedule', (args) => String(args.scheduleId)),
            async ({ scheduleId, payload, siteId, customHeaders, dryRun }) =>
                await runUpdate({
                    spec: {
                        label: 'port schedule',
                        list: () => client.listPortSchedules(siteId, customHeaders),
                    },
                    id: scheduleId,
                    payload,
                    dryRun,
                    write: () => client.updatePortSchedule(scheduleId, payload, siteId, customHeaders),
                    warnings: ['Ports in the schedule are powered off outside the time range, disconnecting whatever is attached.'],
                })
        )
    );
}
