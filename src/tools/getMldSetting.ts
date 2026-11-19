import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import type { OmadaClient } from '../omadaClient/index.js';
import { siteInputSchema, toToolResult, wrapToolHandler } from '../server/common.js';

type Client = Pick<OmadaClient, 'getMldSetting'>;

export function registerGetMldSettingTool(server: McpServer, client: Client): void {
    server.registerTool(
        'getMldSetting',
        {
            description: 'Get the site MLD (IPv6 multicast listener discovery) setting and whether the gateway supports it.',
            inputSchema: siteInputSchema.shape,
        },
        wrapToolHandler('getMldSetting', async ({ siteId, customHeaders }) => toToolResult(await client.getMldSetting(siteId, customHeaders)))
    );
}
