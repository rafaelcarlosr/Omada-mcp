import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import type { OmadaClient } from '../omadaClient/index.js';
import { siteInputSchema, toToolResult, wrapToolHandler } from '../server/common.js';

const inputSchema = siteInputSchema.extend({
    clientMacs: z
        .array(z.string().regex(/^[0-9a-f]{2}([:-][0-9a-f]{2}){5}$/i))
        .min(1)
        .max(100)
        .describe('Client MAC addresses.'),
});

type Client = Pick<OmadaClient, 'getClientIncidentCounts'>;

export function registerGetClientIncidentCountsTool(server: McpServer, client: Client): void {
    server.registerTool(
        'getClientIncidentCounts',
        {
            description: 'Get incident counts for a set of clients.',
            inputSchema: inputSchema.shape,
        },
        wrapToolHandler('getClientIncidentCounts', async ({ clientMacs, siteId, customHeaders }) =>
            toToolResult(await client.getClientIncidentCounts({ clientList: clientMacs }, siteId, customHeaders))
        )
    );
}
