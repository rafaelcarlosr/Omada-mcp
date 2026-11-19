import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import type { OmadaClient } from '../omadaClient/index.js';
import { siteInputSchema, toToolResult, wrapToolHandler } from '../server/common.js';

type Client = Pick<OmadaClient, 'listDuplicateSsidNames'>;

export function registerListDuplicateSsidNamesTool(server: McpServer, client: Client): void {
    server.registerTool(
        'listDuplicateSsidNames',
        {
            description: 'List SSID names used more than once in the site, by band.',
            inputSchema: siteInputSchema.shape,
        },
        wrapToolHandler('listDuplicateSsidNames', async ({ siteId, customHeaders }) =>
            toToolResult(await client.listDuplicateSsidNames(siteId, customHeaders))
        )
    );
}
