import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import type { OmadaClient } from '../omadaClient/index.js';
import { siteInputSchema, toToolResult, wrapToolHandler } from '../server/common.js';
import { createPaginationSchema } from '../utils/pagination-schema.js';

const inputSchema = siteInputSchema.extend(createPaginationSchema());

type Client = Pick<OmadaClient, 'listSwitchOuiRuleSwitches'>;

export function registerListSwitchOuiRuleSwitchesTool(server: McpServer, client: Client): void {
    server.registerTool(
        'listSwitchOuiRuleSwitches',
        {
            description:
                'List the switches of the site for OUI-based VLAN rules, with whether each supports adding the rule VLAN to ports automatically.',
            inputSchema: inputSchema.shape,
        },
        wrapToolHandler('listSwitchOuiRuleSwitches', async ({ page, pageSize, siteId, customHeaders }) =>
            toToolResult(await client.listSwitchOuiRuleSwitches(page ?? 1, pageSize ?? 10, siteId, customHeaders))
        )
    );
}
