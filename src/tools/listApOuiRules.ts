import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import type { OmadaClient } from '../omadaClient/index.js';
import { siteInputSchema, toToolResult, wrapToolHandler } from '../server/common.js';

type Client = Pick<OmadaClient, 'listApOuiRules'>;

export function registerListApOuiRulesTool(server: McpServer, client: Client): void {
    server.registerTool(
        'listApOuiRules',
        {
            description: 'List the AP OUI-based VLAN rules: SSIDs and the VLAN and priority given to each OUI profile.',
            inputSchema: siteInputSchema.shape,
        },
        wrapToolHandler('listApOuiRules', async ({ siteId, customHeaders }) => toToolResult(await client.listApOuiRules(siteId, customHeaders)))
    );
}
