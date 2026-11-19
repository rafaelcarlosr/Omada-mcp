import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import type { OmadaClient } from '../omadaClient/index.js';
import { siteInputSchema, toToolResult, wrapToolHandler } from '../server/common.js';

type Client = Pick<OmadaClient, 'getWirelessIdsConfig'>;

export function registerGetWirelessIdsConfigTool(server: McpServer, client: Client): void {
    server.registerTool(
        'getWirelessIdsConfig',
        {
            description: 'Get the wireless IDS (intrusion detection) setting of a site: status, level and custom detections.',
            inputSchema: siteInputSchema.shape,
        },
        wrapToolHandler('getWirelessIdsConfig', async ({ siteId, customHeaders }) =>
            toToolResult(await client.getWirelessIdsConfig(siteId, customHeaders))
        )
    );
}
