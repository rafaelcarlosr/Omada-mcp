import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import type { OmadaClient } from '../omadaClient/index.js';
import { deviceMacSchema, siteInputSchema, toToolResult, wrapToolHandler } from '../server/common.js';

const inputSchema = siteInputSchema.extend({
    apMac: deviceMacSchema.describe('MAC address of the access point from listDevices.'),
});

type Client = Pick<OmadaClient, 'getApRfScanResult'>;

export function registerGetApRfScanResultTool(server: McpServer, client: Client): void {
    server.registerTool(
        'getApRfScanResult',
        {
            description: 'Get the latest RF scan result of an access point (scan time and per-band status).',
            inputSchema: inputSchema.shape,
        },
        wrapToolHandler('getApRfScanResult', async ({ apMac, siteId, customHeaders }) =>
            toToolResult(await client.getApRfScanResult(apMac, siteId, customHeaders))
        )
    );
}
