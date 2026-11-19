import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import type { OmadaClient } from '../omadaClient/index.js';
import { toToolResult, wrapToolHandler } from '../server/common.js';
import { createPaginationSchema } from '../utils/pagination-schema.js';
import { controllerInputSchema } from './siteAdminShared.js';

const inputSchema = controllerInputSchema.extend({
    siteTemplateId: z.string().trim().min(1).describe('Site template ID from getSiteTemplateList.'),
    searchKey: z.string().min(1).optional().describe('Optional site name search.'),
    ...createPaginationSchema(),
});

type Client = Pick<OmadaClient, 'listSitesAvailableForTemplate'>;

export function registerListSitesAvailableForTemplateTool(server: McpServer, client: Client): void {
    server.registerTool(
        'listSitesAvailableForTemplate',
        {
            description: 'List the sites that can be bound to a site template (paginated).',
            inputSchema: inputSchema.shape,
        },
        wrapToolHandler('listSitesAvailableForTemplate', async ({ siteTemplateId, searchKey, page, pageSize, customHeaders }) =>
            toToolResult(await client.listSitesAvailableForTemplate(siteTemplateId, page ?? 1, pageSize ?? 10, searchKey, customHeaders))
        )
    );
}
