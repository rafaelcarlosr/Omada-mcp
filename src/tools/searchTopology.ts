import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import type { OmadaClient } from '../omadaClient/index.js';
import { siteInputSchema, toToolResult, wrapToolHandler } from '../server/common.js';

const inputSchema = siteInputSchema.extend({
    searchKey: z.string().trim().min(1).describe('Text to find in device or client names, MACs and IPs.'),
});

type Client = Pick<OmadaClient, 'searchTopology'>;

export function registerSearchTopologyTool(server: McpServer, client: Client): void {
    server.registerTool(
        'searchTopology',
        {
            description: 'Search devices and clients in the site topology.',
            inputSchema: inputSchema.shape,
        },
        wrapToolHandler('searchTopology', async ({ searchKey, siteId, customHeaders }) =>
            toToolResult(await client.searchTopology(searchKey, siteId, customHeaders))
        )
    );
}
