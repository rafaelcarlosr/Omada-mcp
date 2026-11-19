import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import type { OmadaClient } from '../omadaClient/index.js';
import { toToolResult, wrapToolHandler } from '../server/common.js';
import { controllerInputSchema } from './siteAdminShared.js';

type Client = Pick<OmadaClient, 'listSiteTemplateAllModules'>;

export function registerListSiteTemplateAllModulesTool(server: McpServer, client: Client): void {
    server.registerTool(
        'listSiteTemplateAllModules',
        {
            description: 'List every site template module for basic and pro sites.',
            inputSchema: controllerInputSchema.shape,
        },
        wrapToolHandler('listSiteTemplateAllModules', async ({ customHeaders }) =>
            toToolResult(await client.listSiteTemplateAllModules(customHeaders))
        )
    );
}
