import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import type { OmadaClient } from '../omadaClient/index.js';
import { toToolResult, wrapToolHandler } from '../server/common.js';
import { controllerInputSchema } from './siteAdminShared.js';

const inputSchema = controllerInputSchema.extend({
    siteIds: z.array(z.string().trim().min(1)).min(1).max(100).describe('Site IDs from listSites.'),
});

type Client = Pick<OmadaClient, 'getMultiSiteTopology'>;

export function registerGetMultiSiteTopologyTool(server: McpServer, client: Client): void {
    server.registerTool(
        'getMultiSiteTopology',
        {
            description: 'Get the topology of several sites in one call.',
            inputSchema: inputSchema.shape,
        },
        wrapToolHandler('getMultiSiteTopology', async ({ siteIds, customHeaders }) =>
            toToolResult(await client.getMultiSiteTopology(siteIds, customHeaders))
        )
    );
}
