import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import type { OmadaClient } from '../omadaClient/index.js';
import { siteInputSchema, toToolResult, wrapToolHandler } from '../server/common.js';
import { createPaginationSchema } from '../utils/pagination-schema.js';

const inputSchema = siteInputSchema.extend({
    ...createPaginationSchema(),
});

type Client = Pick<OmadaClient, 'listAnomalySettings'>;

export function registerListAnomalySettingsTool(server: McpServer, client: Client): void {
    server.registerTool(
        'listAnomalySettings',
        {
            description:
                'List incident detection settings: each anomaly code with its category, level, object type and whether it is detected (paginated).',
            inputSchema: inputSchema.shape,
        },
        wrapToolHandler('listAnomalySettings', async ({ page, pageSize, siteId, customHeaders }) =>
            toToolResult(await client.listAnomalySettings(page ?? 1, pageSize ?? 10, siteId, customHeaders))
        )
    );
}
