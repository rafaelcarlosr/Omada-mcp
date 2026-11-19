import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import type { OmadaClient } from '../omadaClient/index.js';
import { siteInputSchema, toToolResult, wrapToolHandler } from '../server/common.js';

type Client = Pick<OmadaClient, 'listApGroupAps'>;

export function registerListApGroupApsTool(server: McpServer, client: Client): void {
    server.registerTool(
        'listApGroupAps',
        {
            description: 'List the site APs grouped by AP group.',
            inputSchema: siteInputSchema.shape,
        },
        wrapToolHandler('listApGroupAps', async ({ siteId, customHeaders }) => toToolResult(await client.listApGroupAps(siteId, customHeaders)))
    );
}
