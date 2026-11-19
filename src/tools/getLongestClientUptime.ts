import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import type { OmadaClient } from '../omadaClient/index.js';
import { siteInputSchema, toToolResult, wrapToolHandler } from '../server/common.js';

type Client = Pick<OmadaClient, 'getLongestClientUptime'>;

export function registerGetLongestClientUptimeTool(server: McpServer, client: Client): void {
    server.registerTool(
        'getLongestClientUptime',
        {
            description: 'List the clients connected the longest, with traffic and duration.',
            inputSchema: siteInputSchema.shape,
        },
        wrapToolHandler('getLongestClientUptime', async ({ siteId, customHeaders }) =>
            toToolResult(await client.getLongestClientUptime(siteId, customHeaders))
        )
    );
}
