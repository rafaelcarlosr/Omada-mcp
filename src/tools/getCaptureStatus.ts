import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import type { OmadaClient } from '../omadaClient/index.js';
import { captureDeviceTypeSchema } from '../omadaClient/topology.js';
import { deviceMacSchema, siteInputSchema, toToolResult, wrapToolHandler } from '../server/common.js';

const inputSchema = siteInputSchema.extend({
    deviceType: captureDeviceTypeSchema.describe('ap, switch or gateway.'),
    deviceMac: deviceMacSchema.describe('Device MAC from listDevices.'),
    requestId: z.string().trim().min(1).describe('Capture request ID.'),
});

type Client = Pick<OmadaClient, 'getCaptureStatus'>;

export function registerGetCaptureStatusTool(server: McpServer, client: Client): void {
    server.registerTool(
        'getCaptureStatus',
        {
            description: 'Get the status of a packet capture on a device.',
            inputSchema: inputSchema.shape,
        },
        wrapToolHandler('getCaptureStatus', async ({ deviceType, deviceMac, requestId, siteId, customHeaders }) =>
            toToolResult(await client.getCaptureStatus(deviceType, deviceMac, requestId, siteId, customHeaders))
        )
    );
}
