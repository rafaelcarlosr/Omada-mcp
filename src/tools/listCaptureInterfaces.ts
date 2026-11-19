import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import type { OmadaClient } from '../omadaClient/index.js';
import { captureDeviceTypeSchema } from '../omadaClient/topology.js';
import { deviceMacSchema, siteInputSchema, toToolResult, wrapToolHandler } from '../server/common.js';

const inputSchema = siteInputSchema.extend({
    deviceType: captureDeviceTypeSchema.describe('ap, switch or gateway.'),
    deviceMac: deviceMacSchema.describe('Device MAC from listDevices.'),
});

type Client = Pick<OmadaClient, 'listCaptureInterfaces'>;

export function registerListCaptureInterfacesTool(server: McpServer, client: Client): void {
    server.registerTool(
        'listCaptureInterfaces',
        {
            description: 'List the ports and radios a device can capture packets on, with their link status and downlink devices.',
            inputSchema: inputSchema.shape,
        },
        wrapToolHandler('listCaptureInterfaces', async ({ deviceType, deviceMac, siteId, customHeaders }) =>
            toToolResult(await client.listCaptureInterfaces(deviceType, deviceMac, siteId, customHeaders))
        )
    );
}
