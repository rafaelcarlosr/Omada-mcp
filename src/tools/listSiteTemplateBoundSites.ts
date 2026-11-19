import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import type { OmadaClient } from '../omadaClient/index.js';
import { toToolResult, wrapToolHandler } from '../server/common.js';
import { createPaginationSchema } from '../utils/pagination-schema.js';
import { controllerInputSchema } from './siteAdminShared.js';

const inputSchema = controllerInputSchema.extend({
    siteTemplateId: z.string().trim().min(1).describe('Site template ID from getSiteTemplateList.'),
    ...createPaginationSchema(),
});

type Client = Pick<OmadaClient, 'listSiteTemplateBoundSites'>;

export function registerListSiteTemplateBoundSitesTool(server: McpServer, client: Client): void {
    server.registerTool(
        'listSiteTemplateBoundSites',
        {
            description: 'List the sites bound to a site template with their sync status and overrides (paginated).',
            inputSchema: inputSchema.shape,
        },
        wrapToolHandler('listSiteTemplateBoundSites', async ({ siteTemplateId, page, pageSize, customHeaders }) =>
            toToolResult(await client.listSiteTemplateBoundSites(siteTemplateId, page ?? 1, pageSize ?? 10, customHeaders))
        )
    );
}
