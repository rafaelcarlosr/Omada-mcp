import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import type { OmadaClient } from '../omadaClient/index.js';
import { deviceMacSchema, siteInputSchema, toToolResult, wrapToolHandler } from '../server/common.js';

const inputSchema = siteInputSchema.extend({
    apMac: deviceMacSchema.describe('MAC address of the access point from listDevices.'),
});

type Client = Pick<OmadaClient, 'getApSsidOverrides'>;

export function registerGetApSsidOverridesTool(server: McpServer, client: Client): void {
    server.registerTool(
        'getApSsidOverrides',
        {
            description:
                'Get the per-AP SSID overrides (SSID enable, name, password and VLAN overrides) of an access point; ssidEntryId values feed setApSsidOverrides.',
            inputSchema: inputSchema.shape,
        },
        wrapToolHandler('getApSsidOverrides', async ({ apMac, siteId, customHeaders }) =>
            toToolResult(await client.getApSsidOverrides(apMac, siteId, customHeaders))
        )
    );
}
