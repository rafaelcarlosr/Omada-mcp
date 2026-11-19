import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import type { OmadaClient } from '../omadaClient/index.js';
import { deviceMacSchema, siteInputSchema, toToolResult, wrapToolHandler } from '../server/common.js';

const inputSchema = siteInputSchema.extend({
    deviceMac: deviceMacSchema.describe('Device MAC from listDevices.'),
    clientType: z.enum(['0', '1', '0,1']).optional().describe('Optional filter: 0 all but IP cameras, 1 only IP cameras, 0,1 all.'),
});

type Client = Pick<OmadaClient, 'listTopologyDeviceAllClients' | 'listTopologyDeviceClients'>;

export function registerListTopologyDeviceClientsTool(server: McpServer, client: Client): void {
    server.registerTool(
        'listTopologyDeviceClients',
        {
            description: 'List the clients attached to one device in the topology, with uplink port and link speed.',
            inputSchema: inputSchema.shape,
        },
        wrapToolHandler('listTopologyDeviceClients', async ({ deviceMac, clientType, siteId, customHeaders }) =>
            toToolResult(
                clientType
                    ? await client.listTopologyDeviceAllClients(deviceMac, clientType, siteId, customHeaders)
                    : await client.listTopologyDeviceClients(deviceMac, siteId, customHeaders)
            )
        )
    );
}
