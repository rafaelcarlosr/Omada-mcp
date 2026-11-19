import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import type { OmadaClient } from '../omadaClient/index.js';
import { siteInputSchema, toToolResult, wrapToolHandler } from '../server/common.js';

const inputSchema = siteInputSchema.extend({
    time: z.number().int().nonnegative().describe('Point in time, epoch milliseconds.'),
    topK: z.number().int().min(1).max(99).default(10).describe('How many entries, under 100.'),
    searchKey: z.string().min(1).optional().describe('Name or MAC search.'),
});

type Client = Pick<OmadaClient, 'listWifiHealthTopClients'>;

export function registerListWifiHealthTopClientsTool(server: McpServer, client: Client): void {
    server.registerTool(
        'listWifiHealthTopClients',
        {
            description: 'List the devices and clients with the worst Wi-Fi health at a point in time.',
            inputSchema: inputSchema.shape,
        },
        wrapToolHandler('listWifiHealthTopClients', async ({ time, topK, searchKey, siteId, customHeaders }) =>
            toToolResult(await client.listWifiHealthTopClients(time, topK ?? 10, searchKey, siteId, customHeaders))
        )
    );
}
