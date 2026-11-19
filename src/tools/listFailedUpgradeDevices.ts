import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import type { OmadaClient } from '../omadaClient/index.js';
import { siteInputSchema, toToolResult, wrapToolHandler } from '../server/common.js';
import { createPaginationSchema } from '../utils/pagination-schema.js';

const inputSchema = siteInputSchema.pick({ customHeaders: true }).extend({
    upgradeLogId: z.string().trim().min(1).describe('Upgrade log ID from the firmware upgrade logs.'),
    ...createPaginationSchema(),
});

type Client = Pick<OmadaClient, 'listFailedUpgradeDevices'>;

export function registerListFailedUpgradeDevicesTool(server: McpServer, client: Client): void {
    server.registerTool(
        'listFailedUpgradeDevices',
        {
            description: 'List the devices whose firmware upgrade failed in an upgrade run (paginated).',
            inputSchema: inputSchema.shape,
        },
        wrapToolHandler('listFailedUpgradeDevices', async ({ upgradeLogId, page, pageSize, customHeaders }) =>
            toToolResult(await client.listFailedUpgradeDevices(upgradeLogId, page ?? 1, pageSize ?? 10, customHeaders))
        )
    );
}
