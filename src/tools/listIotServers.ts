import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import type { OmadaClient } from '../omadaClient/index.js';
import { siteInputSchema, toToolResult, wrapToolHandler } from '../server/common.js';

type Client = Pick<OmadaClient, 'listIotServers'>;

export function registerListIotServersTool(server: McpServer, client: Client): void {
    server.registerTool(
        'listIotServers',
        {
            description:
                'List the IoT transport streams (servers that APs send Bluetooth device reports to). Tokens and client IDs are masked. Returns every page.',
            inputSchema: siteInputSchema.shape,
        },
        wrapToolHandler('listIotServers', async ({ siteId, customHeaders }) => toToolResult(await client.listIotServers(siteId, customHeaders)))
    );
}
