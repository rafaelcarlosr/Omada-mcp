import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import type { OmadaClient } from '../omadaClient/index.js';
import { siteInputSchema, toToolResult, wrapToolHandler } from '../server/common.js';

type Client = Pick<OmadaClient, 'getAnomalyNotificationSetting'>;

export function registerGetAnomalyNotificationSettingTool(server: McpServer, client: Client): void {
    server.registerTool(
        'getAnomalyNotificationSetting',
        {
            description: 'Get the incident email notification setting: delay, levels, object types and categories.',
            inputSchema: siteInputSchema.shape,
        },
        wrapToolHandler('getAnomalyNotificationSetting', async ({ siteId, customHeaders }) =>
            toToolResult(await client.getAnomalyNotificationSetting(siteId, customHeaders))
        )
    );
}
