import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import type { OmadaClient } from '../omadaClient/index.js';
import { deviceMacSchema, siteInputSchema, toToolResult, wrapToolHandler } from '../server/common.js';

const inputSchema = siteInputSchema.extend({
    apMac: deviceMacSchema.describe('MAC address of the access point from listDevices.'),
});

type Client = Pick<OmadaClient, 'getApInterferenceDetectionStatus'>;

export function registerGetApInterferenceDetectionStatusTool(server: McpServer, client: Client): void {
    server.registerTool(
        'getApInterferenceDetectionStatus',
        {
            description: 'Get the interference detection status of an access point (Wi-Fi, non-Wi-Fi and channel-load detection).',
            inputSchema: inputSchema.shape,
        },
        wrapToolHandler('getApInterferenceDetectionStatus', async ({ apMac, siteId, customHeaders }) =>
            toToolResult(await client.getApInterferenceDetectionStatus(apMac, siteId, customHeaders))
        )
    );
}
