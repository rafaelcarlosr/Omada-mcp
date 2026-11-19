import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import type { OmadaClient } from '../omadaClient/index.js';
import { siteInputSchema, toToolResult, wrapToolHandler } from '../server/common.js';

type Client = Pick<OmadaClient, 'listWifiCallingProfiles'>;

export function registerListWifiCallingProfilesTool(server: McpServer, client: Client): void {
    server.registerTool(
        'listWifiCallingProfiles',
        {
            description: 'List the Wi-Fi calling profiles of the site with their carriers and ePDG servers.',
            inputSchema: siteInputSchema.shape,
        },
        wrapToolHandler('listWifiCallingProfiles', async ({ siteId, customHeaders }) =>
            toToolResult(await client.listWifiCallingProfiles(siteId, customHeaders))
        )
    );
}
