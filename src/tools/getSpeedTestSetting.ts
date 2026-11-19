import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import type { OmadaClient } from '../omadaClient/index.js';
import { siteInputSchema, toToolResult, wrapToolHandler } from '../server/common.js';

type Client = Pick<OmadaClient, 'getSpeedTestSetting'>;

export function registerGetSpeedTestSettingTool(server: McpServer, client: Client): void {
    server.registerTool(
        'getSpeedTestSetting',
        {
            description: 'Get the scheduled gateway speed test setting (daily, weekly or monthly time).',
            inputSchema: siteInputSchema.shape,
        },
        wrapToolHandler('getSpeedTestSetting', async ({ siteId, customHeaders }) =>
            toToolResult(await client.getSpeedTestSetting(siteId, customHeaders))
        )
    );
}
