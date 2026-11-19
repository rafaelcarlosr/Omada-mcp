import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import type { OmadaClient } from '../omadaClient/index.js';
import { siteInputSchema, toToolResult, wrapToolHandler } from '../server/common.js';

const inputSchema = siteInputSchema.extend({
    ssidId: z.string().trim().min(1).describe('SSID ID from listAllSsids.'),
});

type Client = Pick<OmadaClient, 'listSsidApGroups'>;

export function registerListSsidApGroupsTool(server: McpServer, client: Client): void {
    server.registerTool(
        'listSsidApGroups',
        {
            description: 'List the AP groups an SSID is broadcast on, with the remaining SSID capacity of each group.',
            inputSchema: inputSchema.shape,
        },
        wrapToolHandler('listSsidApGroups', async ({ ssidId, siteId, customHeaders }) =>
            toToolResult(await client.listSsidApGroups(ssidId, siteId, customHeaders))
        )
    );
}
