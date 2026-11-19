import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import type { OmadaClient } from '../omadaClient/index.js';
import { siteInputSchema, toToolResult, wrapToolHandler } from '../server/common.js';

type Client = Pick<OmadaClient, 'getApDensity'>;

export function registerGetApDensityTool(server: McpServer, client: Client): void {
    server.registerTool(
        'getApDensity',
        {
            description: 'Show whether the site has APs and APs with clients, for the AP density view.',
            inputSchema: siteInputSchema.shape,
        },
        wrapToolHandler('getApDensity', async ({ siteId, customHeaders }) => toToolResult(await client.getApDensity(siteId, customHeaders)))
    );
}
