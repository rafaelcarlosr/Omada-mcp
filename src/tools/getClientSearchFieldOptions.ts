import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import type { OmadaClient } from '../omadaClient/index.js';
import { siteInputSchema, toToolResult, wrapToolHandler } from '../server/common.js';

type Client = Pick<OmadaClient, 'getClientSearchFieldOptions'>;

export function registerGetClientSearchFieldOptionsTool(server: McpServer, client: Client): void {
    server.registerTool(
        'getClientSearchFieldOptions',
        {
            description: 'Get the values available for the client list filters (device categories, types, vendors, OS).',
            inputSchema: siteInputSchema.shape,
        },
        wrapToolHandler('getClientSearchFieldOptions', async ({ siteId, customHeaders }) =>
            toToolResult(await client.getClientSearchFieldOptions(siteId, customHeaders))
        )
    );
}
