import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import type { OmadaClient } from '../omadaClient/index.js';
import { captureDeviceTypeSchema } from '../omadaClient/topology.js';
import { siteInputSchema, toToolResult, wrapToolHandler } from '../server/common.js';

const inputSchema = siteInputSchema.extend({
    deviceType: captureDeviceTypeSchema.describe('ap, switch or gateway.'),
});

type Client = Pick<OmadaClient, 'listCaptureCapableDevices'>;

export function registerListCaptureCapableDevicesTool(server: McpServer, client: Client): void {
    server.registerTool(
        'listCaptureCapableDevices',
        {
            description: 'List the devices of one type that support packet capture.',
            inputSchema: inputSchema.shape,
        },
        wrapToolHandler('listCaptureCapableDevices', async ({ deviceType, siteId, customHeaders }) =>
            toToolResult(await client.listCaptureCapableDevices(deviceType, siteId, customHeaders))
        )
    );
}
