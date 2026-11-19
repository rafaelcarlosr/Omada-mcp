import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import type { OmadaClient } from '../omadaClient/index.js';
import { toToolResult, wrapToolHandler } from '../server/common.js';
import { controllerInputSchema } from './siteAdminShared.js';

type Client = Pick<OmadaClient, 'getUpgradePort'>;

export function registerGetUpgradePortTool(server: McpServer, client: Client): void {
    server.registerTool(
        'getUpgradePort',
        {
            description: 'Get the HTTPS port devices use to download firmware from the controller.',
            inputSchema: controllerInputSchema.shape,
        },
        wrapToolHandler('getUpgradePort', async ({ customHeaders }) => toToolResult(await client.getUpgradePort(customHeaders)))
    );
}
