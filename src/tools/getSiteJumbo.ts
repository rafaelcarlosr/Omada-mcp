import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import type { OmadaClient } from '../omadaClient/index.js';
import { siteInputSchema, toToolResult, wrapToolHandler } from '../server/common.js';

type Client = Pick<OmadaClient, 'getSiteJumbo'>;

export function registerGetSiteJumboTool(server: McpServer, client: Client): void {
    server.registerTool(
        'getSiteJumbo',
        {
            description: 'Get the jumbo frame size of the switches in the site.',
            inputSchema: siteInputSchema.shape,
        },
        wrapToolHandler('getSiteJumbo', async ({ siteId, customHeaders }) => toToolResult(await client.getSiteJumbo(siteId, customHeaders)))
    );
}
