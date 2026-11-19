import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import type { OmadaClient } from '../omadaClient/index.js';
import { toToolResult, wrapToolHandler } from '../server/common.js';
import { controllerInputSchema } from './siteAdminShared.js';

type Client = Pick<OmadaClient, 'getClientDetailInformation'>;

export function registerGetClientDetailInformationTool(server: McpServer, client: Client): void {
    server.registerTool(
        'getClientDetailInformation',
        {
            description: 'Show the client recognition, health, history and data trend switches and their retention.',
            inputSchema: controllerInputSchema.shape,
        },
        wrapToolHandler('getClientDetailInformation', async ({ customHeaders }) =>
            toToolResult(await client.getClientDetailInformation(customHeaders))
        )
    );
}
