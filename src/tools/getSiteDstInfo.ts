import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import type { OmadaClient } from '../omadaClient/index.js';
import { siteInputSchema, toToolResult, wrapToolHandler } from '../server/common.js';

type Client = Pick<OmadaClient, 'getSiteDstInfo'>;

export function registerGetSiteDstInfoTool(server: McpServer, client: Client): void {
    server.registerTool(
        'getSiteDstInfo',
        {
            description: 'Get the daylight saving time state, offset and next transitions of a site.',
            inputSchema: siteInputSchema.shape,
        },
        wrapToolHandler('getSiteDstInfo', async ({ siteId, customHeaders }) => toToolResult(await client.getSiteDstInfo(siteId, customHeaders)))
    );
}
