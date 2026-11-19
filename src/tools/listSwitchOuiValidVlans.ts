import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import type { OmadaClient } from '../omadaClient/index.js';
import { siteInputSchema, toToolResult, wrapToolHandler } from '../server/common.js';

type Client = Pick<OmadaClient, 'listSwitchOuiValidVlans'>;

export function registerListSwitchOuiValidVlansTool(server: McpServer, client: Client): void {
    server.registerTool(
        'listSwitchOuiValidVlans',
        {
            description: 'List the site VLANs that OUI-based VLAN rules can use (VLAN 2-4090 with their LAN network IDs). Returns every page.',
            inputSchema: siteInputSchema.shape,
        },
        wrapToolHandler('listSwitchOuiValidVlans', async ({ siteId, customHeaders }) =>
            toToolResult(await client.listSwitchOuiValidVlans(siteId, customHeaders))
        )
    );
}
