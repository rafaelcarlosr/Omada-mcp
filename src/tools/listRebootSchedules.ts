import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import type { OmadaClient } from '../omadaClient/index.js';
import { siteInputSchema, toToolResult, wrapToolHandler } from '../server/common.js';

type Client = Pick<OmadaClient, 'listRebootSchedules'>;

export function registerListRebootSchedulesTool(server: McpServer, client: Client): void {
    server.registerTool(
        'listRebootSchedules',
        {
            description: 'List the device reboot schedules of the site.',
            inputSchema: siteInputSchema.shape,
        },
        wrapToolHandler('listRebootSchedules', async ({ siteId, customHeaders }) =>
            toToolResult(await client.listRebootSchedules(siteId, customHeaders))
        )
    );
}
