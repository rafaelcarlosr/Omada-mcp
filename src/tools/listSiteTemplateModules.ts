import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import type { OmadaClient } from '../omadaClient/index.js';
import { toToolResult, wrapToolHandler } from '../server/common.js';
import { controllerInputSchema } from './siteAdminShared.js';

type Client = Pick<OmadaClient, 'listSiteTemplateModules'>;

export function registerListSiteTemplateModulesTool(server: McpServer, client: Client): void {
    server.registerTool(
        'listSiteTemplateModules',
        {
            description: 'List the optional setting modules a new site template can include.',
            inputSchema: controllerInputSchema.shape,
        },
        wrapToolHandler('listSiteTemplateModules', async ({ customHeaders }) => toToolResult(await client.listSiteTemplateModules(customHeaders)))
    );
}
