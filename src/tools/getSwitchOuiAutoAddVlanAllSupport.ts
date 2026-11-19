import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import type { OmadaClient } from '../omadaClient/index.js';
import { siteInputSchema, toToolResult, wrapToolHandler } from '../server/common.js';

type Client = Pick<OmadaClient, 'getSwitchOuiAutoAddVlanAllSupport'>;

export function registerGetSwitchOuiAutoAddVlanAllSupportTool(server: McpServer, client: Client): void {
    server.registerTool(
        'getSwitchOuiAutoAddVlanAllSupport',
        {
            description: 'Show whether every switch of the site supports adding OUI-based VLAN rule VLANs to ports automatically.',
            inputSchema: siteInputSchema.shape,
        },
        wrapToolHandler('getSwitchOuiAutoAddVlanAllSupport', async ({ siteId, customHeaders }) =>
            toToolResult(await client.getSwitchOuiAutoAddVlanAllSupport(siteId, customHeaders))
        )
    );
}
