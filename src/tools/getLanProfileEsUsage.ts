import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import type { OmadaClient } from '../omadaClient/index.js';
import { customHeadersSchema, siteInputSchema, toToolResult, wrapToolHandler } from '../server/common.js';

const inputSchema = siteInputSchema
    .extend({
        profileId: z.string().min(1).describe('LAN profile ID. Use getLanProfileList to find profile IDs.'),
        customHeaders: customHeadersSchema,
    })
    .required({ profileId: true });

export function registerGetLanProfileEsUsageTool(server: McpServer, client: OmadaClient): void {
    server.registerTool(
        'getLanProfileEsUsage',
        {
            description:
                'List the Agile Series (ES) switch ports that use a LAN profile; profiles that do not apply to ES switches are rejected (-33558). Returns every page. Requires `profileId`.',
            inputSchema: inputSchema.shape,
        },
        wrapToolHandler('getLanProfileEsUsage', async ({ profileId, siteId, customHeaders }) =>
            toToolResult(await client.getLanProfileEsUsage(profileId, siteId, customHeaders))
        )
    );
}
