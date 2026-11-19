import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import type { OmadaClient } from '../omadaClient/index.js';
import { siteInputSchema, toToolResult, wrapToolHandler } from '../server/common.js';
import { createPaginationSchema } from '../utils/pagination-schema.js';

const inputSchema = siteInputSchema.extend(createPaginationSchema());

type Client = Pick<OmadaClient, 'listSwitchOuiAutoAddVlanSwitches'>;

export function registerListSwitchOuiAutoAddVlanSwitchesTool(server: McpServer, client: Client): void {
    server.registerTool(
        'listSwitchOuiAutoAddVlanSwitches',
        {
            description: 'List the switches that support adding OUI rule VLANs to ports automatically, with their ports and LAGs.',
            inputSchema: inputSchema.shape,
        },
        wrapToolHandler('listSwitchOuiAutoAddVlanSwitches', async ({ page, pageSize, siteId, customHeaders }) =>
            toToolResult(await client.listSwitchOuiAutoAddVlanSwitches(page ?? 1, pageSize ?? 10, siteId, customHeaders))
        )
    );
}
