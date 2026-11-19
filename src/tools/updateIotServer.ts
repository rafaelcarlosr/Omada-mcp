import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import type { OmadaClient } from '../omadaClient/index.js';
import { configIotServerOpenApiVOSchema } from '../omadaClient/requestSchemas.js';
import { siteInputSchema, wrapMutationToolHandler } from '../server/common.js';
import { dryRunSchema, mutationSummary, runUpdate } from './resourceMutationShared.js';

const inputSchema = siteInputSchema.extend({
    iotServerId: z.string().trim().min(1).describe('IoT transport stream ID from listIotServers.'),
    payload: configIotServerOpenApiVOSchema.describe('Complete IoT transport stream (official ConfigIotServerOpenApiVO).'),
    dryRun: dryRunSchema,
});

type Client = Pick<OmadaClient, 'listIotServers' | 'updateIotServer'>;

export function registerUpdateIotServerTool(server: McpServer, client: Client): void {
    server.registerTool(
        'updateIotServer',
        {
            description: 'Replace an IoT transport stream. Defaults to a preview; set dryRun:false to apply once and verify by readback.',
            inputSchema: inputSchema.shape,
            annotations: { destructiveHint: true },
        },
        wrapMutationToolHandler<typeof inputSchema.shape>(
            'updateIotServer',
            mutationSummary('update-iot-server', (args) => String(args.iotServerId)),
            async ({ iotServerId, payload, siteId, customHeaders, dryRun }) =>
                await runUpdate({
                    spec: {
                        label: 'IoT transport stream',
                        list: () => client.listIotServers(siteId, customHeaders),
                    },
                    id: iotServerId,
                    payload,
                    dryRun,
                    write: () => client.updateIotServer(iotServerId, payload, siteId, customHeaders),
                    warnings: ['APs send Bluetooth device data to this server.'],
                })
        )
    );
}
