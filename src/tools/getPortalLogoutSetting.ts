import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import type { OmadaClient } from '../omadaClient/index.js';
import { siteInputSchema, toToolResult, wrapToolHandler } from '../server/common.js';

type Client = Pick<OmadaClient, 'getPortalLogoutSetting'>;

export function registerGetPortalLogoutSettingTool(server: McpServer, client: Client): void {
    server.registerTool(
        'getPortalLogoutSetting',
        {
            description: 'Get the domain of the captive portal logout URL.',
            inputSchema: siteInputSchema.shape,
        },
        wrapToolHandler('getPortalLogoutSetting', async ({ siteId, customHeaders }) =>
            toToolResult(await client.getPortalLogoutSetting(siteId, customHeaders))
        )
    );
}
