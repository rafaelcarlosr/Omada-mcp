import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import type { OmadaClient } from '../omadaClient/index.js';
import { siteInputSchema, toToolResult, wrapToolHandler } from '../server/common.js';

type Client = Pick<OmadaClient, 'listSwitchOuiRules'>;

export function registerListSwitchOuiRulesTool(server: McpServer, client: Client): void {
    server.registerTool(
        'listSwitchOuiRules',
        {
            description:
                'List the switch OUI-based VLAN rules (which OUI profiles go to which VLAN and priority, on which switch ports). Returns every page.',
            inputSchema: siteInputSchema.shape,
        },
        wrapToolHandler('listSwitchOuiRules', async ({ siteId, customHeaders }) =>
            toToolResult(await client.listSwitchOuiRules(siteId, customHeaders))
        )
    );
}
