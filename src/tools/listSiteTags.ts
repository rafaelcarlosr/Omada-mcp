import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import type { OmadaClient } from '../omadaClient/index.js';
import { toToolResult, wrapToolHandler } from '../server/common.js';
import { controllerInputSchema } from './siteAdminShared.js';

type Client = Pick<OmadaClient, 'listSiteTags'>;

export function registerListSiteTagsTool(server: McpServer, client: Client): void {
    server.registerTool(
        'listSiteTags',
        {
            description: 'List the site tags of the controller with their IDs.',
            inputSchema: controllerInputSchema.shape,
        },
        wrapToolHandler('listSiteTags', async ({ customHeaders }) => toToolResult(await client.listSiteTags(customHeaders)))
    );
}
