import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import type { OmadaClient } from '../omadaClient/index.js';
import { siteInputSchema, toToolResult, wrapToolHandler } from '../server/common.js';

type Client = Pick<OmadaClient, 'listEapDot1xCandidates'>;

export function registerListEapDot1xCandidatesTool(server: McpServer, client: Client): void {
    server.registerTool(
        'listEapDot1xCandidates',
        {
            description: 'List the APs that can take part in EAP 802.1X authentication.',
            inputSchema: siteInputSchema.shape,
        },
        wrapToolHandler('listEapDot1xCandidates', async ({ siteId, customHeaders }) =>
            toToolResult(await client.listEapDot1xCandidates(siteId, customHeaders))
        )
    );
}
