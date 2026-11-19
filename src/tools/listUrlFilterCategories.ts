import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import type { OmadaClient } from '../omadaClient/index.js';
import { siteInputSchema, toToolResult, wrapToolHandler } from '../server/common.js';

type Client = Pick<OmadaClient, 'listUrlFilterCategories'>;

export function registerListUrlFilterCategoriesTool(server: McpServer, client: Client): void {
    server.registerTool(
        'listUrlFilterCategories',
        {
            description: 'List the content filtering categories and their subcategories for URL filter rules.',
            inputSchema: siteInputSchema.shape,
        },
        wrapToolHandler('listUrlFilterCategories', async ({ siteId, customHeaders }) =>
            toToolResult(await client.listUrlFilterCategories(siteId, customHeaders))
        )
    );
}
