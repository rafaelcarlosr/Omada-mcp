import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import type { OmadaClient } from '../omadaClient/index.js';
import { configIotServerOpenApiVOSchema } from '../omadaClient/requestSchemas.js';
import { siteInputSchema, wrapMutationToolHandler } from '../server/common.js';
import { dryRunSchema, mutationSummary, runCreate } from './resourceMutationShared.js';

const inputSchema = siteInputSchema.extend({
    payload: configIotServerOpenApiVOSchema.describe(
        'IoT transport stream (official ConfigIotServerOpenApiVO): name, enable, serverUrl (http://...), serverType 0, deviceClasses (1 iBeacon, 2 Eddystone), reportInterval, authentication 0 with accessToken and clientId, rssiFormat, blePeriodicTelemetry, rawData, optional countOnly, filtersType and filters.'
    ),
    dryRun: dryRunSchema,
});

type Client = Pick<OmadaClient, 'createIotServer' | 'listIotServers'>;

export function registerCreateIotServerTool(server: McpServer, client: Client): void {
    server.registerTool(
        'createIotServer',
        {
            description:
                'Create an IoT transport stream: an HTTP server that APs send Bluetooth (iBeacon, Eddystone) reports to, with token authentication and filters. Defaults to a preview; set dryRun:false to apply once and verify by readback.',
            inputSchema: inputSchema.shape,
            annotations: { destructiveHint: true },
        },
        wrapMutationToolHandler<typeof inputSchema.shape>(
            'createIotServer',
            mutationSummary('create-iot-server', (args) => String((args.payload as { name?: unknown }).name)),
            async ({ payload, siteId, customHeaders, dryRun }) =>
                await runCreate({
                    spec: {
                        label: 'IoT transport stream',
                        list: () => client.listIotServers(siteId, customHeaders),
                    },
                    payload,
                    dryRun,
                    write: () => client.createIotServer(payload, siteId, customHeaders),
                    warnings: ['APs send Bluetooth device data to this server.'],
                })
        )
    );
}
