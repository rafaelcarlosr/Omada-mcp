import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import type { OmadaClient } from '../omadaClient/index.js';
import { siteInputSchema, toToolResult, wrapToolHandler } from '../server/common.js';

const inputSchema = siteInputSchema.extend({
    deviceStatus: z.enum(['0', '1', '0,1']).optional().describe('Optional filter: 0 connected, 1 disconnected, 0,1 both (uses the v3 topology).'),
});

type Client = Pick<OmadaClient, 'getSiteTopology' | 'getSiteTopologyByStatus'>;

export function registerGetSiteTopologyTool(server: McpServer, client: Client): void {
    server.registerTool(
        'getSiteTopology',
        {
            description: 'Get the site topology: devices, uplinks, ports and client counts as shown on the controller map.',
            inputSchema: inputSchema.shape,
        },
        wrapToolHandler('getSiteTopology', async ({ deviceStatus, siteId, customHeaders }) =>
            toToolResult(
                deviceStatus
                    ? await client.getSiteTopologyByStatus(deviceStatus, siteId, customHeaders)
                    : await client.getSiteTopology(siteId, customHeaders)
            )
        )
    );
}
