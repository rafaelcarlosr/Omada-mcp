import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import type { OmadaClient } from '../omadaClient/index.js';
import { toToolResult, wrapToolHandler } from '../server/common.js';
import { controllerInputSchema } from './siteAdminShared.js';

const inputSchema = controllerInputSchema.extend({
    siteIds: z.array(z.string().trim().min(1)).max(300).optional().describe('Optional site IDs; countries blocked on any site when omitted.'),
});

type Client = Pick<OmadaClient, 'listBlockedCountries'>;

export function registerListBlockedCountriesTool(server: McpServer, client: Client): void {
    server.registerTool(
        'listBlockedCountries',
        {
            description: 'List the country codes whose traffic the gateway IPS blocks, for the given sites or any site.',
            inputSchema: inputSchema.shape,
        },
        wrapToolHandler('listBlockedCountries', async ({ siteIds, customHeaders }) =>
            toToolResult(await client.listBlockedCountries(siteIds, customHeaders))
        )
    );
}
