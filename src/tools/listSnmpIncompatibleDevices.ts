import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import type { OmadaClient } from '../omadaClient/index.js';
import { siteInputSchema, toToolResult, wrapToolHandler } from '../server/common.js';

type Client = Pick<OmadaClient, 'listSnmpIncompatibleDevices'>;

export function registerListSnmpIncompatibleDevicesTool(server: McpServer, client: Client): void {
    server.registerTool(
        'listSnmpIncompatibleDevices',
        {
            description: 'List the site devices that do not support the current SNMP version.',
            inputSchema: siteInputSchema.shape,
        },
        wrapToolHandler('listSnmpIncompatibleDevices', async ({ siteId, customHeaders }) =>
            toToolResult(await client.listSnmpIncompatibleDevices(siteId, customHeaders))
        )
    );
}
