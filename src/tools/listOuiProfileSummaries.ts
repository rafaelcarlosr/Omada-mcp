import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import type { OmadaClient } from '../omadaClient/index.js';
import { siteInputSchema, toToolResult, wrapToolHandler } from '../server/common.js';

type Client = Pick<OmadaClient, 'listOuiProfileSummaries'>;

export function registerListOuiProfileSummariesTool(server: McpServer, client: Client): void {
    server.registerTool(
        'listOuiProfileSummaries',
        {
            description: 'List every OUI profile of the site as id and name, for choosing one in an OUI-based VLAN rule.',
            inputSchema: siteInputSchema.shape,
        },
        wrapToolHandler('listOuiProfileSummaries', async ({ siteId, customHeaders }) =>
            toToolResult(await client.listOuiProfileSummaries(siteId, customHeaders))
        )
    );
}
