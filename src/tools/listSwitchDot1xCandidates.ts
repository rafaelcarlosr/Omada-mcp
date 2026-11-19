import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import type { OmadaClient } from '../omadaClient/index.js';
import { siteInputSchema, toToolResult, wrapToolHandler } from '../server/common.js';

type Client = Pick<OmadaClient, 'listSwitchDot1xCandidates'>;

export function registerListSwitchDot1xCandidatesTool(server: McpServer, client: Client): void {
    server.registerTool(
        'listSwitchDot1xCandidates',
        {
            description: 'List the switches and ports that can take part in 802.1X authentication.',
            inputSchema: siteInputSchema.shape,
        },
        wrapToolHandler('listSwitchDot1xCandidates', async ({ siteId, customHeaders }) =>
            toToolResult(await client.listSwitchDot1xCandidates(siteId, customHeaders))
        )
    );
}
