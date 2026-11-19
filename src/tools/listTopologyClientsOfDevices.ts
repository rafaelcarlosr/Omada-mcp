import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import type { OmadaClient } from '../omadaClient/index.js';
import { deviceMacSchema, siteInputSchema, toToolResult, wrapToolHandler } from '../server/common.js';

const inputSchema = siteInputSchema.extend({
    deviceMacs: z.array(deviceMacSchema).min(1).max(500).describe('Device MACs from listDevices.'),
    clientType: z.enum(['0', '1', '0,1']).default('0,1').describe('0 all but IP cameras, 1 only IP cameras, 0,1 all (default).'),
});

type Client = Pick<OmadaClient, 'listTopologyClientsOfDevices'>;

export function registerListTopologyClientsOfDevicesTool(server: McpServer, client: Client): void {
    server.registerTool(
        'listTopologyClientsOfDevices',
        {
            description: 'List the topology clients of several devices at once.',
            inputSchema: inputSchema.shape,
        },
        wrapToolHandler('listTopologyClientsOfDevices', async ({ deviceMacs, clientType, siteId, customHeaders }) =>
            toToolResult(await client.listTopologyClientsOfDevices(deviceMacs, clientType, siteId, customHeaders))
        )
    );
}
