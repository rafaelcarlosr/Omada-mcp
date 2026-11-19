import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import type { OmadaClient } from '../omadaClient/index.js';
import { siteInputSchema, toToolResult, wrapToolHandler } from '../server/common.js';

type Client = Pick<OmadaClient, 'listHotspotRateLimitProfiles'>;

export function registerListHotspotRateLimitProfilesTool(server: McpServer, client: Client): void {
    server.registerTool(
        'listHotspotRateLimitProfiles',
        {
            description: 'List the rate limit profiles available to hotspot vouchers and local users.',
            inputSchema: siteInputSchema.shape,
        },
        wrapToolHandler('listHotspotRateLimitProfiles', async ({ siteId, customHeaders }) =>
            toToolResult(await client.listHotspotRateLimitProfiles(siteId, customHeaders))
        )
    );
}
