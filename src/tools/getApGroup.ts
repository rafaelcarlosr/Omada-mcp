import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import type { OmadaClient } from '../omadaClient/index.js';
import { siteInputSchema, toToolResult, wrapToolHandler } from '../server/common.js';

const inputSchema = siteInputSchema.extend({
    apGroupId: z.string().trim().min(1).describe('AP group ID from listApGroups.'),
});

type Client = Pick<OmadaClient, 'getApGroup'>;

export function registerGetApGroupTool(server: McpServer, client: Client): void {
    server.registerTool(
        'getApGroup',
        {
            description: 'Get one AP group with its member APs.',
            inputSchema: inputSchema.shape,
        },
        wrapToolHandler('getApGroup', async ({ apGroupId, siteId, customHeaders }) =>
            toToolResult(await client.getApGroup(apGroupId, siteId, customHeaders))
        )
    );
}
