import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import type { OmadaClient } from '../omadaClient/index.js';
import { toToolResult, wrapToolHandler } from '../server/common.js';
import { controllerInputSchema } from './siteAdminShared.js';

type Client = Pick<OmadaClient, 'listPlacedSitePositions'>;

export function registerListPlacedSitePositionsTool(server: McpServer, client: Client): void {
    server.registerTool(
        'listPlacedSitePositions',
        {
            description: 'List the sites placed on the global map with their coordinates.',
            inputSchema: controllerInputSchema.shape,
        },
        wrapToolHandler('listPlacedSitePositions', async ({ customHeaders }) => toToolResult(await client.listPlacedSitePositions(customHeaders)))
    );
}
