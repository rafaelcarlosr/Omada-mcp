import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import type { OmadaClient } from '../omadaClient/index.js';
import { customHeadersSchema, toToolResult, wrapToolHandler } from '../server/common.js';
import { createPaginationSchema } from '../utils/pagination-schema.js';

const inputSchema = z.object({ ...createPaginationSchema(100), customHeaders: customHeadersSchema });

export function registerGetSiteTemplateListTool(server: McpServer, client: OmadaClient): void {
    server.registerTool(
        'getSiteTemplateList',
        {
            description: 'Get the site templates configured on the controller, with their bound-site counts (paginated).',
            inputSchema: inputSchema.shape,
        },
        wrapToolHandler('getSiteTemplateList', async ({ page, pageSize, customHeaders }) =>
            toToolResult(await client.getSiteTemplateList(page ?? 1, pageSize ?? 100, customHeaders))
        )
    );
}
