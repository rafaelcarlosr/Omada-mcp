import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import type { OmadaClient } from '../omadaClient/index.js';
import { siteInputSchema, toToolResult, wrapToolHandler } from '../server/common.js';

type Client = Pick<OmadaClient, 'getIotRadioSetting'>;

export function registerGetIotRadioSettingTool(server: McpServer, client: Client): void {
    server.registerTool(
        'getIotRadioSetting',
        {
            description:
                'Get the AP Bluetooth (IoT) radio setting: enable, console mode, transmit power and aging time. The console passcode is masked.',
            inputSchema: siteInputSchema.shape,
        },
        wrapToolHandler('getIotRadioSetting', async ({ siteId, customHeaders }) =>
            toToolResult(await client.getIotRadioSetting(siteId, customHeaders))
        )
    );
}
