import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import type { OmadaClient } from '../omadaClient/index.js';
import { siteInputSchema, toToolResult, wrapToolHandler } from '../server/common.js';

type Client = Pick<OmadaClient, 'getSwitchPortView'>;

export function registerGetSwitchPortViewTool(server: McpServer, client: Client): void {
    server.registerTool(
        'getSwitchPortView',
        {
            description:
                'Get the per-switch summary used by the controller ports view: model, firmware, port count and PoE capability for each switch.',
            inputSchema: siteInputSchema.shape,
        },
        wrapToolHandler('getSwitchPortView', async ({ siteId, customHeaders }) => toToolResult(await client.getSwitchPortView(siteId, customHeaders)))
    );
}
