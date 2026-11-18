import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import type { OmadaClient } from '../omadaClient/index.js';
import { portScheduleOpenApiVOSchema } from '../omadaClient/requestSchemas.js';
import { siteInputSchema, wrapMutationToolHandler } from '../server/common.js';
import { dryRunSchema, mutationSummary, runCreate } from './resourceMutationShared.js';

/** The spec types portsMap as a bare object; its documented shape is switch MAC -> port numbers. */
const portScheduleSchema = portScheduleOpenApiVOSchema.extend({
    portsMap: z.record(z.string(), z.array(z.number().int().min(1))).describe('Switch MAC -> list of port numbers covered by the schedule.'),
});

const inputSchema = siteInputSchema.extend({
    payload: portScheduleSchema.describe(
        'Port schedule (official PortScheduleOpenApiVO): name, status, turnOnTime = time range profile ID, and portsMap from switch MAC to the port numbers it powers on.'
    ),
    dryRun: dryRunSchema,
});

type Client = Pick<OmadaClient, 'createPortSchedule' | 'listPortSchedules'>;

export function registerCreatePortScheduleTool(server: McpServer, client: Client): void {
    server.registerTool(
        'createPortSchedule',
        {
            description:
                'Create a port schedule that turns switch ports on only inside a time range profile; ports outside it are shut down. Defaults to a preview; set dryRun:false to apply once and verify by readback.',
            inputSchema: inputSchema.shape,
            annotations: { destructiveHint: true },
        },
        wrapMutationToolHandler<typeof inputSchema.shape>(
            'createPortSchedule',
            mutationSummary('create-port-schedule', (args) => String((args.payload as { name?: unknown }).name)),
            async ({ payload, siteId, customHeaders, dryRun }) =>
                await runCreate({
                    spec: {
                        label: 'port schedule',
                        list: () => client.listPortSchedules(siteId, customHeaders),
                    },
                    payload,
                    dryRun,
                    write: () => client.createPortSchedule(payload, siteId, customHeaders),
                    warnings: ['Ports in the schedule are powered off outside the time range, disconnecting whatever is attached.'],
                })
        )
    );
}
