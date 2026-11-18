import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import type { OmadaClient } from '../omadaClient/index.js';
import { deviceMacSchema, siteInputSchema, toToolResult, wrapToolHandler } from '../server/common.js';

const inputSchema = siteInputSchema.extend({
    apMac: deviceMacSchema.describe('MAC address of the access point from listDevices.'),
});

type Client = Pick<OmadaClient, 'getApManagementWlan'>;

export function registerGetApManagementWlanTool(server: McpServer, client: Client): void {
    server.registerTool(
        'getApManagementWlan',
        {
            description: 'Get the management SSID of an access point (name, security, broadcast, VLAN).',
            inputSchema: inputSchema.shape,
        },
        wrapToolHandler('getApManagementWlan', async ({ apMac, siteId, customHeaders }) =>
            toToolResult(await client.getApManagementWlan(apMac, siteId, customHeaders))
        )
    );
}
