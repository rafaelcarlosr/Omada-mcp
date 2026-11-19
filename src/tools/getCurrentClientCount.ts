import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import type { OmadaClient } from '../omadaClient/index.js';
import { siteInputSchema, toToolResult, wrapToolHandler } from '../server/common.js';

type Client = Pick<OmadaClient, 'getCurrentClientCount'>;

export function registerGetCurrentClientCountTool(server: McpServer, client: Client): void {
    server.registerTool(
        'getCurrentClientCount',
        {
            description: 'Get the current number of wired and wireless clients of the site.',
            inputSchema: siteInputSchema.shape,
        },
        wrapToolHandler('getCurrentClientCount', async ({ siteId, customHeaders }) =>
            toToolResult(await client.getCurrentClientCount(siteId, customHeaders))
        )
    );
}
