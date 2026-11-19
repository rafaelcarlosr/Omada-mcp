import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import type { OmadaClient } from '../omadaClient/index.js';
import { siteInputSchema, wrapMutationToolHandler } from '../server/common.js';
import { dryRunSchema, mutationSummary, runDelete } from './resourceMutationShared.js';

const inputSchema = siteInputSchema.extend({
    iotServerId: z.string().trim().min(1).describe('IoT transport stream ID from listIotServers.'),
    dryRun: dryRunSchema,
});

type Client = Pick<OmadaClient, 'deleteIotServer' | 'listIotServers'>;

export function registerDeleteIotServerTool(server: McpServer, client: Client): void {
    server.registerTool(
        'deleteIotServer',
        {
            description:
                'Delete an IoT transport stream; APs stop reporting to that server. Defaults to a preview of the record; set dryRun:false to delete and verify it is gone.',
            inputSchema: inputSchema.shape,
            annotations: { destructiveHint: true },
        },
        wrapMutationToolHandler<typeof inputSchema.shape>(
            'deleteIotServer',
            mutationSummary('delete-iot-server', (args) => String(args.iotServerId)),
            async ({ iotServerId, siteId, customHeaders, dryRun }) =>
                await runDelete({
                    spec: {
                        label: 'IoT transport stream',
                        list: () => client.listIotServers(siteId, customHeaders),
                    },
                    id: iotServerId,
                    dryRun,
                    write: () => client.deleteIotServer(iotServerId, siteId, customHeaders),
                    warnings: ['APs stop reporting Bluetooth data to this server.'],
                })
        )
    );
}
