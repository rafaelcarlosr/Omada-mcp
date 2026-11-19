import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import type { OmadaClient } from '../omadaClient/index.js';
import { siteInputSchema, toToolResult, wrapToolHandler } from '../server/common.js';

type Client = Pick<OmadaClient, 'listPortalsWithLogout'>;

export function registerListPortalsWithLogoutTool(server: McpServer, client: Client): void {
    server.registerTool(
        'listPortalsWithLogout',
        {
            description: 'List the captive portals that have logout enabled.',
            inputSchema: siteInputSchema.shape,
        },
        wrapToolHandler('listPortalsWithLogout', async ({ siteId, customHeaders }) =>
            toToolResult(await client.listPortalsWithLogout(siteId, customHeaders))
        )
    );
}
