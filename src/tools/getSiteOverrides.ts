import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import type { OmadaClient } from '../omadaClient/index.js';
import { toToolResult, wrapToolHandler } from '../server/common.js';
import { controllerInputSchema } from './siteAdminShared.js';

const inputSchema = controllerInputSchema.extend({
    siteIds: z.array(z.string().trim().min(1)).min(1).max(100).describe('Site IDs from listSites.'),
});

type Client = Pick<OmadaClient, 'getSiteOverrides'>;

export function registerGetSiteOverridesTool(server: McpServer, client: Client): void {
    server.registerTool(
        'getSiteOverrides',
        {
            description: 'Show which settings of the given sites override their site template.',
            inputSchema: inputSchema.shape,
        },
        wrapToolHandler('getSiteOverrides', async ({ siteIds, customHeaders }) => toToolResult(await client.getSiteOverrides(siteIds, customHeaders)))
    );
}
