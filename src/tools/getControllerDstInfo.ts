import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import type { OmadaClient } from '../omadaClient/index.js';
import { toToolResult, wrapToolHandler } from '../server/common.js';
import { controllerInputSchema } from './siteAdminShared.js';

type Client = Pick<OmadaClient, 'getControllerDstInfo'>;

export function registerGetControllerDstInfoTool(server: McpServer, client: Client): void {
    server.registerTool(
        'getControllerDstInfo',
        {
            description: 'Get the controller daylight saving time state, offset and next transitions.',
            inputSchema: controllerInputSchema.shape,
        },
        wrapToolHandler('getControllerDstInfo', async ({ customHeaders }) => toToolResult(await client.getControllerDstInfo(customHeaders)))
    );
}
