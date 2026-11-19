import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import type { OmadaClient } from '../omadaClient/index.js';
import { siteInputSchema, toToolResult, wrapToolHandler } from '../server/common.js';

const inputSchema = siteInputSchema.extend({
    ssidId: z.string().trim().min(1).describe('SSID ID from listAllSsids.'),
});

type Client = Pick<OmadaClient, 'listTopologySsidDevices'>;

export function registerListTopologySsidDevicesTool(server: McpServer, client: Client): void {
    server.registerTool(
        'listTopologySsidDevices',
        {
            description: 'List the MACs of the devices that broadcast one SSID.',
            inputSchema: inputSchema.shape,
        },
        wrapToolHandler('listTopologySsidDevices', async ({ ssidId, siteId, customHeaders }) =>
            toToolResult(await client.listTopologySsidDevices(ssidId, siteId, customHeaders))
        )
    );
}
