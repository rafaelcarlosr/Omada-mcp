import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import type { OmadaClient } from '../omadaClient/index.js';
import { siteInputSchema, toToolResult, wrapToolHandler } from '../server/common.js';

type Client = Pick<OmadaClient, 'listLanMulticasts'>;

export function registerListLanMulticastsTool(server: McpServer, client: Client): void {
    server.registerTool(
        'listLanMulticasts',
        {
            description: 'List the IGMP/MLD multicast snooping configurations of a site.',
            inputSchema: siteInputSchema.shape,
        },
        wrapToolHandler('listLanMulticasts', async ({ siteId, customHeaders }) => toToolResult(await client.listLanMulticasts(siteId, customHeaders)))
    );
}
