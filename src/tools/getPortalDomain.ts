import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import type { OmadaClient } from '../omadaClient/index.js';
import { siteInputSchema, toToolResult, wrapToolHandler } from '../server/common.js';

type Client = Pick<OmadaClient, 'getPortalDomain'>;

export function registerGetPortalDomainTool(server: McpServer, client: Client): void {
    server.registerTool(
        'getPortalDomain',
        {
            description: 'Get the portal domain setting of the site.',
            inputSchema: siteInputSchema.shape,
        },
        wrapToolHandler('getPortalDomain', async ({ siteId, customHeaders }) => toToolResult(await client.getPortalDomain(siteId, customHeaders)))
    );
}
