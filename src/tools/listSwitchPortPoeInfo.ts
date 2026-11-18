import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import type { OmadaClient } from '../omadaClient/index.js';
import { siteInputSchema, toToolResult, wrapToolHandler } from '../server/common.js';

type Client = Pick<OmadaClient, 'listSwitchPortPoeInfo'>;

export function registerListSwitchPortPoeInfoTool(server: McpServer, client: Client): void {
    server.registerTool(
        'listSwitchPortPoeInfo',
        {
            description:
                'List PoE state for every switch port in the site: PoE on/off, power draw (W), voltage, current, PD class and link status. Returns every page.',
            inputSchema: siteInputSchema.shape,
        },
        wrapToolHandler('listSwitchPortPoeInfo', async ({ siteId, customHeaders }) =>
            toToolResult(await client.listSwitchPortPoeInfo(siteId, customHeaders))
        )
    );
}
