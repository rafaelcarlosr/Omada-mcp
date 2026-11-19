import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import type { OmadaClient } from '../omadaClient/index.js';
import { siteInputSchema, toToolResult, wrapToolHandler } from '../server/common.js';
import { createPaginationSchema } from '../utils/pagination-schema.js';

const inputSchema = siteInputSchema.extend(createPaginationSchema());

type Client = Pick<OmadaClient, 'listSwitchOuiSupportedSwitches'>;

export function registerListSwitchOuiSupportedSwitchesTool(server: McpServer, client: Client): void {
    server.registerTool(
        'listSwitchOuiSupportedSwitches',
        {
            description: 'List the switches (and stacks or M-LAG pairs) that support OUI-based VLAN rules, with their ports and LAGs.',
            inputSchema: inputSchema.shape,
        },
        wrapToolHandler('listSwitchOuiSupportedSwitches', async ({ page, pageSize, siteId, customHeaders }) =>
            toToolResult(await client.listSwitchOuiSupportedSwitches(page ?? 1, pageSize ?? 10, siteId, customHeaders))
        )
    );
}
