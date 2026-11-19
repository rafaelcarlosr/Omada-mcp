import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import type { OmadaClient } from '../omadaClient/index.js';
import { siteInputSchema, toToolResult, wrapToolHandler } from '../server/common.js';

type Client = Pick<OmadaClient, 'listApnProfiles'>;

export function registerListApnProfilesTool(server: McpServer, client: Client): void {
    server.registerTool(
        'listApnProfiles',
        {
            description:
                'List the APN profiles of the site (static or dynamic APN, PDP type, authentication) used by LTE/5G gateways. Passwords are masked.',
            inputSchema: siteInputSchema.shape,
        },
        wrapToolHandler('listApnProfiles', async ({ siteId, customHeaders }) => toToolResult(await client.listApnProfiles(siteId, customHeaders)))
    );
}
