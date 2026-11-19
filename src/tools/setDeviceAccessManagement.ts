import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { OmadaClient } from '../omadaClient/index.js';
import { deviceAccessManagementVO21Schema } from '../omadaClient/requestSchemas.js';
import { wrapMutationToolHandler } from '../server/common.js';
import { dryRunSchema, mutationSummary, runSettings } from './resourceMutationShared.js';
import { controllerInputSchema } from './siteAdminShared.js';

const inputSchema = controllerInputSchema.extend({
    payload: deviceAccessManagementVO21Schema.describe(
        'Device access (official DeviceAccessManagementVO): webControlHttp, webControlHttps, appDiscovery.'
    ),
    dryRun: dryRunSchema,
});

type Client = Pick<OmadaClient, 'getDeviceAccessManagement' | 'setDeviceAccessManagement'>;

export function registerSetDeviceAccessManagementTool(server: McpServer, client: Client): void {
    server.registerTool(
        'setDeviceAccessManagement',
        {
            description:
                'Turn device web management over HTTP or HTTPS and Omada app discovery on or off. Defaults to a preview of the current setting and differences; set dryRun:false to apply once and verify by readback.',
            inputSchema: inputSchema.shape,
            annotations: { destructiveHint: true },
        },
        wrapMutationToolHandler<typeof inputSchema.shape>(
            'setDeviceAccessManagement',
            mutationSummary('set-device-access-management', () => 'controller'),
            async ({ payload, customHeaders, dryRun }) =>
                await runSettings({
                    label: 'device access management',
                    read: () => client.getDeviceAccessManagement(customHeaders),
                    payload,
                    dryRun,
                    write: () => client.setDeviceAccessManagement(payload, customHeaders),
                    warnings: ['Turning off HTTP and HTTPS removes local web access to the devices; manage them through the controller.'],
                })
        )
    );
}
