import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import type { OmadaClient } from '../omadaClient/index.js';
import { siteInputSchema, toToolResult, wrapToolHandler } from '../server/common.js';

type Client = Pick<OmadaClient, 'getUnresolvedIncidentCount'>;

export function registerGetUnresolvedIncidentCountTool(server: McpServer, client: Client): void {
    server.registerTool(
        'getUnresolvedIncidentCount',
        {
            description: 'Get the number of active (unresolved) incidents of the site.',
            inputSchema: siteInputSchema.shape,
        },
        wrapToolHandler('getUnresolvedIncidentCount', async ({ siteId, customHeaders }) =>
            toToolResult(await client.getUnresolvedIncidentCount(siteId, customHeaders))
        )
    );
}
