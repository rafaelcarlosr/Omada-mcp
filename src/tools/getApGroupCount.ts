import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import type { OmadaClient } from '../omadaClient/index.js';
import { siteInputSchema, toToolResult, wrapToolHandler } from '../server/common.js';

type Client = Pick<OmadaClient, 'getApGroupCount'>;

export function registerGetApGroupCountTool(server: McpServer, client: Client): void {
    server.registerTool(
        'getApGroupCount',
        {
            description: 'Get the number of AP groups and whether the site limit is exceeded.',
            inputSchema: siteInputSchema.shape,
        },
        wrapToolHandler('getApGroupCount', async ({ siteId, customHeaders }) => toToolResult(await client.getApGroupCount(siteId, customHeaders)))
    );
}
