import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import type { OmadaClient } from '../omadaClient/index.js';
import { siteInputSchema, toToolResult, wrapToolHandler } from '../server/common.js';

export function registerGetRoutingTableTool(server: McpServer, client: OmadaClient): void {
    const inputSchema = z.object({
        type: z
            .enum(['gateway', 'switch'])
            .describe(
                'Whose routing table to read: "gateway" for the gateway, "switch" for every routing switch (entries carry the switch MAC and name).'
            ),
        ...siteInputSchema.shape,
    });

    server.registerTool(
        'getRoutingTable',
        {
            description:
                'Get the live routing table of the site gateway or of its routing switches: destination, next hop, interface and metric. Returns every page.',
            inputSchema: inputSchema.shape,
        },
        wrapToolHandler('getRoutingTable', async ({ type, siteId, customHeaders }) =>
            toToolResult(await client.getRoutingTable(type, siteId, customHeaders))
        )
    );
}
