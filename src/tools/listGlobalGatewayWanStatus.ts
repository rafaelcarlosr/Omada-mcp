import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import type { OmadaClient } from '../omadaClient/index.js';
import { toToolResult, wrapToolHandler } from '../server/common.js';
import { createPaginationSchema } from '../utils/pagination-schema.js';
import { controllerInputSchema } from './siteAdminShared.js';

const inputSchema = controllerInputSchema.extend(createPaginationSchema());

type Client = Pick<OmadaClient, 'listGlobalGatewayWanStatus'>;

export function registerListGlobalGatewayWanStatusTool(server: McpServer, client: Client): void {
    server.registerTool(
        'listGlobalGatewayWanStatus',
        {
            description: 'List the WAN status of gateways across all sites (paginated).',
            inputSchema: inputSchema.shape,
        },
        wrapToolHandler('listGlobalGatewayWanStatus', async ({ page, pageSize, customHeaders }) =>
            toToolResult(await client.listGlobalGatewayWanStatus(page ?? 1, pageSize ?? 10, customHeaders))
        )
    );
}
