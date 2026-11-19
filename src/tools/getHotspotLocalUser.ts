import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import type { OmadaClient } from '../omadaClient/index.js';
import { siteInputSchema, toToolResult, wrapToolHandler } from '../server/common.js';

const inputSchema = siteInputSchema.extend({
    userId: z.string().trim().min(1).describe('Local user ID from listHotspotLocalUsers.'),
});

type Client = Pick<OmadaClient, 'getHotspotLocalUser'>;

export function registerGetHotspotLocalUserTool(server: McpServer, client: Client): void {
    server.registerTool(
        'getHotspotLocalUser',
        {
            description: 'Get one hotspot local user with limits, binding and portals. The password is masked.',
            inputSchema: inputSchema.shape,
        },
        wrapToolHandler('getHotspotLocalUser', async ({ userId, siteId, customHeaders }) =>
            toToolResult(await client.getHotspotLocalUser(userId, siteId, customHeaders))
        )
    );
}
