import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import type { OmadaClient } from '../omadaClient/index.js';
import { siteInputSchema, toToolResult, wrapToolHandler } from '../server/common.js';

type Client = Pick<OmadaClient, 'getIntelliRecoverSetting'>;

export function registerGetIntelliRecoverSettingTool(server: McpServer, client: Client): void {
    server.registerTool(
        'getIntelliRecoverSetting',
        {
            description:
                'Get the intelli-recover setting: whether unreachable devices are recovered automatically by cycling the PoE of their uplink port, and its intervals.',
            inputSchema: siteInputSchema.shape,
        },
        wrapToolHandler('getIntelliRecoverSetting', async ({ siteId, customHeaders }) =>
            toToolResult(await client.getIntelliRecoverSetting(siteId, customHeaders))
        )
    );
}
