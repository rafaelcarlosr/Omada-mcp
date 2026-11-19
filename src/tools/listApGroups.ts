import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import type { OmadaClient } from '../omadaClient/index.js';
import { siteInputSchema, toToolResult, wrapToolHandler } from '../server/common.js';

const inputSchema = siteInputSchema.extend({
    searchKey: z.string().trim().min(1).optional().describe('Optional case-insensitive filter on the AP group name.'),
});

type Client = Pick<OmadaClient, 'listApGroups'>;

export function registerListApGroupsTool(server: McpServer, client: Client): void {
    server.registerTool(
        'listApGroups',
        {
            description: 'List the AP groups of a site with their AP count, bound SSIDs and remaining SSID capacity per band.',
            inputSchema: inputSchema.shape,
        },
        wrapToolHandler('listApGroups', async ({ searchKey, siteId, customHeaders }) => {
            const groups = await client.listApGroups(siteId, customHeaders);
            if (!searchKey) return toToolResult(groups);
            const needle = searchKey.toLowerCase();
            return toToolResult(
                groups.filter((group) =>
                    String((group as { name?: unknown })?.name ?? '')
                        .toLowerCase()
                        .includes(needle)
                )
            );
        })
    );
}
