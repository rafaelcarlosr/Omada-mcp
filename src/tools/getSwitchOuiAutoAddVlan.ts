import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import type { OmadaClient } from '../omadaClient/index.js';
import { siteInputSchema, toToolResult, wrapToolHandler } from '../server/common.js';

type Client = Pick<OmadaClient, 'getSwitchOuiAutoAddVlan'>;

export function registerGetSwitchOuiAutoAddVlanTool(server: McpServer, client: Client): void {
    server.registerTool(
        'getSwitchOuiAutoAddVlan',
        {
            description: 'Show whether the site adds OUI-based VLAN rule VLANs to switch ports automatically.',
            inputSchema: siteInputSchema.shape,
        },
        wrapToolHandler('getSwitchOuiAutoAddVlan', async ({ siteId, customHeaders }) =>
            toToolResult(await client.getSwitchOuiAutoAddVlan(siteId, customHeaders))
        )
    );
}
