import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import type { OmadaClient } from '../omadaClient/index.js';
import { siteInputSchema, toToolResult, wrapToolHandler } from '../server/common.js';

type Client = Pick<OmadaClient, 'listDhcpReservationTargets'>;

export function registerListDhcpReservationTargetsTool(server: McpServer, client: Client): void {
    server.registerTool(
        'listDhcpReservationTargets',
        {
            description: 'List the networks that accept DHCP reservations and the DHCP servers and address ranges that serve them.',
            inputSchema: siteInputSchema.shape,
        },
        wrapToolHandler('listDhcpReservationTargets', async ({ siteId, customHeaders }) =>
            toToolResult(await client.listDhcpReservationTargets(siteId, customHeaders))
        )
    );
}
