import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import type { OmadaClient } from '../omadaClient/index.js';
import { siteInputSchema, toToolResult, wrapToolHandler } from '../server/common.js';

type Client = Pick<OmadaClient, 'getReportEmailSchedule'>;

export function registerGetReportEmailScheduleTool(server: McpServer, client: Client): void {
    server.registerTool(
        'getReportEmailSchedule',
        {
            description: 'Get the scheduled network report email setting.',
            inputSchema: siteInputSchema.shape,
        },
        wrapToolHandler('getReportEmailSchedule', async ({ siteId, customHeaders }) =>
            toToolResult(await client.getReportEmailSchedule(siteId, customHeaders))
        )
    );
}
