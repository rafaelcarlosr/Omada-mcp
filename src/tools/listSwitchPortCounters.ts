import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import type { OmadaClient } from '../omadaClient/index.js';
import { siteInputSchema, toToolResult, wrapToolHandler } from '../server/common.js';

type Client = Pick<OmadaClient, 'listSwitchPortCounters'>;

export function registerListSwitchPortCountersTool(server: McpServer, client: Client): void {
    server.registerTool(
        'listSwitchPortCounters',
        {
            description:
                'List traffic counters for every switch port in the site: bytes and packets sent and received, errors and drops. Returns every page.',
            inputSchema: siteInputSchema.shape,
        },
        wrapToolHandler('listSwitchPortCounters', async ({ siteId, customHeaders }) =>
            toToolResult(await client.listSwitchPortCounters(siteId, customHeaders))
        )
    );
}
