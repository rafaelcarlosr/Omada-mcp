import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import type { OmadaClient } from '../omadaClient/index.js';
import { siteInputSchema, toToolResult, wrapToolHandler } from '../server/common.js';

type Client = Pick<OmadaClient, 'listHotspotAuthRecords'>;

export function registerListHotspotAuthRecordsTool(server: McpServer, client: Client): void {
    server.registerTool(
        'listHotspotAuthRecords',
        {
            description: 'List hotspot authentication records (client, auth type, voucher or user, traffic and session times). Returns every page.',
            inputSchema: siteInputSchema.shape,
        },
        wrapToolHandler('listHotspotAuthRecords', async ({ siteId, customHeaders }) =>
            toToolResult(await client.listHotspotAuthRecords(siteId, customHeaders))
        )
    );
}
