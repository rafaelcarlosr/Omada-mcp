import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import type { OmadaClient } from '../omadaClient/index.js';
import { siteInputSchema, toToolResult, wrapToolHandler } from '../server/common.js';

type Client = Pick<OmadaClient, 'getSiteMailServer'>;

export function registerGetSiteMailServerTool(server: McpServer, client: Client): void {
    server.registerTool(
        'getSiteMailServer',
        {
            description:
                'Get the site mail server (sender, receiver, SMTP server, port, SSL, authentication). The authorization code is masked; returns nothing when none is set.',
            inputSchema: siteInputSchema.shape,
        },
        wrapToolHandler('getSiteMailServer', async ({ siteId, customHeaders }) => toToolResult(await client.getSiteMailServer(siteId, customHeaders)))
    );
}
