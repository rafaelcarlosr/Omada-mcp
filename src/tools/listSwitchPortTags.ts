import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import type { OmadaClient } from '../omadaClient/index.js';
import { siteInputSchema, toToolResult, wrapToolHandler } from '../server/common.js';

type Client = Pick<OmadaClient, 'listSwitchPortTags'>;

export function registerListSwitchPortTagsTool(server: McpServer, client: Client): void {
    server.registerTool(
        'listSwitchPortTags',
        {
            description: 'List the switch port labels defined in the site.',
            inputSchema: siteInputSchema.shape,
        },
        wrapToolHandler('listSwitchPortTags', async ({ siteId, customHeaders }) =>
            toToolResult(await client.listSwitchPortTags(siteId, customHeaders))
        )
    );
}
