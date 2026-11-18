import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import type { OmadaClient } from '../omadaClient/index.js';
import { deviceMacSchema, siteInputSchema, toToolResult, wrapToolHandler } from '../server/common.js';

const inputSchema = siteInputSchema.extend({
    apMac: deviceMacSchema.describe('MAC address of the access point from listDevices.'),
});

type Client = Pick<OmadaClient, 'getApLanTraffic'>;

export function registerGetApLanTrafficTool(server: McpServer, client: Client): void {
    server.registerTool(
        'getApLanTraffic',
        {
            description: 'Get the wired LAN traffic counters of an access point (packets, bytes, drops, errors).',
            inputSchema: inputSchema.shape,
        },
        wrapToolHandler('getApLanTraffic', async ({ apMac, siteId, customHeaders }) =>
            toToolResult(await client.getApLanTraffic(apMac, siteId, customHeaders))
        )
    );
}
