import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import type { OmadaClient } from '../omadaClient/index.js';
import { siteInputSchema, toToolResult, wrapToolHandler } from '../server/common.js';

type Client = Pick<OmadaClient, 'getEoGreTunnelConfig'>;

export function registerGetEoGreTunnelConfigTool(server: McpServer, client: Client): void {
    server.registerTool(
        'getEoGreTunnelConfig',
        {
            description: 'Get the site EoGRE tunnel settings: enable state, tunnel MTU, keepalive interval and count, and gateway addresses.',
            inputSchema: siteInputSchema.shape,
        },
        wrapToolHandler('getEoGreTunnelConfig', async ({ siteId, customHeaders }) =>
            toToolResult(await client.getEoGreTunnelConfig(siteId, customHeaders))
        )
    );
}
