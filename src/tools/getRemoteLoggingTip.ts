import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import type { OmadaClient } from '../omadaClient/index.js';
import { siteInputSchema, toToolResult, wrapToolHandler } from '../server/common.js';

type Client = Pick<OmadaClient, 'getRemoteLoggingTip'>;

export function registerGetRemoteLoggingTipTool(server: McpServer, client: Client): void {
    server.registerTool(
        'getRemoteLoggingTip',
        {
            description: 'Get the remote logging hint the controller shows for a site (the effective syslog target and options).',
            inputSchema: siteInputSchema.shape,
        },
        wrapToolHandler('getRemoteLoggingTip', async ({ siteId, customHeaders }) =>
            toToolResult(await client.getRemoteLoggingTip(siteId, customHeaders))
        )
    );
}
