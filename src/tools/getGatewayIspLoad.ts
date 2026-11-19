import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import type { OmadaClient } from '../omadaClient/index.js';
import { siteInputSchema, toToolResult, wrapToolHandler } from '../server/common.js';

type Client = Pick<OmadaClient, 'getGatewayIspLoad'>;

export function registerGetGatewayIspLoadTool(server: McpServer, client: Client): void {
    server.registerTool(
        'getGatewayIspLoad',
        {
            description: 'Get the current ISP load of the gateway WAN ports.',
            inputSchema: siteInputSchema.shape,
        },
        wrapToolHandler('getGatewayIspLoad', async ({ siteId, customHeaders }) => toToolResult(await client.getGatewayIspLoad(siteId, customHeaders)))
    );
}
