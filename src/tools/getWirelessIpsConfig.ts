import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import type { OmadaClient } from '../omadaClient/index.js';
import { siteInputSchema, toToolResult, wrapToolHandler } from '../server/common.js';

type Client = Pick<OmadaClient, 'getWirelessIpsConfig'>;

export function registerGetWirelessIpsConfigTool(server: McpServer, client: Client): void {
    server.registerTool(
        'getWirelessIpsConfig',
        {
            description: 'Get the wireless IPS (intrusion prevention) setting of a site: status, deauthentication and dynamic block list.',
            inputSchema: siteInputSchema.shape,
        },
        wrapToolHandler('getWirelessIpsConfig', async ({ siteId, customHeaders }) =>
            toToolResult(await client.getWirelessIpsConfig(siteId, customHeaders))
        )
    );
}
