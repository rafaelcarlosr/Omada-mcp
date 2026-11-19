import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import type { OmadaClient } from '../omadaClient/index.js';
import { siteInputSchema, toToolResult, wrapToolHandler } from '../server/common.js';

type Client = Pick<OmadaClient, 'listTopologyIsolatedDevices'>;

export function registerListTopologyIsolatedDevicesTool(server: McpServer, client: Client): void {
    server.registerTool(
        'listTopologyIsolatedDevices',
        {
            description: 'List isolated (unreachable uplink) and preconfigured devices in the topology.',
            inputSchema: siteInputSchema.shape,
        },
        wrapToolHandler('listTopologyIsolatedDevices', async ({ siteId, customHeaders }) =>
            toToolResult(await client.listTopologyIsolatedDevices(siteId, customHeaders))
        )
    );
}
