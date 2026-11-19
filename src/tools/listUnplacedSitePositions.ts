import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import type { OmadaClient } from '../omadaClient/index.js';
import { toToolResult, wrapToolHandler } from '../server/common.js';
import { createPaginationSchema } from '../utils/pagination-schema.js';
import { controllerInputSchema } from './siteAdminShared.js';

const inputSchema = controllerInputSchema.extend({
    ...createPaginationSchema(),
    searchKey: z.string().min(1).optional().describe('Optional fuzzy search on the site name.'),
});

type Client = Pick<OmadaClient, 'listUnplacedSitePositions'>;

export function registerListUnplacedSitePositionsTool(server: McpServer, client: Client): void {
    server.registerTool(
        'listUnplacedSitePositions',
        {
            description: 'List the sites not yet placed on the global map (paginated, optional name search).',
            inputSchema: inputSchema.shape,
        },
        wrapToolHandler('listUnplacedSitePositions', async ({ page, pageSize, searchKey, customHeaders }) =>
            toToolResult(await client.listUnplacedSitePositions(page ?? 1, pageSize ?? 10, searchKey, customHeaders))
        )
    );
}
