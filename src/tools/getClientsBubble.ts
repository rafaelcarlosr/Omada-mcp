import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import type { OmadaClient } from '../omadaClient/index.js';
import { siteInputSchema, toToolResult, wrapToolHandler } from '../server/common.js';

type Client = Pick<OmadaClient, 'getClientsBubble'>;

export function registerGetClientsBubbleTool(server: McpServer, client: Client): void {
    server.registerTool(
        'getClientsBubble',
        {
            description: 'Get the wireless client bubble chart data (signal and traffic per client).',
            inputSchema: siteInputSchema.shape,
        },
        wrapToolHandler('getClientsBubble', async ({ siteId, customHeaders }) => toToolResult(await client.getClientsBubble(siteId, customHeaders)))
    );
}
