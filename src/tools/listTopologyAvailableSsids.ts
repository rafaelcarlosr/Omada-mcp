import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import type { OmadaClient } from '../omadaClient/index.js';
import { siteInputSchema, toToolResult, wrapToolHandler } from '../server/common.js';

const inputSchema = siteInputSchema.extend({
    searchKey: z.string().optional().describe('Optional SSID name filter.'),
});

type Client = Pick<OmadaClient, 'listTopologyAvailableSsids'>;

export function registerListTopologyAvailableSsidsTool(server: McpServer, client: Client): void {
    server.registerTool(
        'listTopologyAvailableSsids',
        {
            description: 'List the SSIDs the topology map can filter by.',
            inputSchema: inputSchema.shape,
        },
        wrapToolHandler('listTopologyAvailableSsids', async ({ searchKey, siteId, customHeaders }) =>
            toToolResult(await client.listTopologyAvailableSsids(searchKey ?? '', siteId, customHeaders))
        )
    );
}
