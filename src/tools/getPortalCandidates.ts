import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import type { OmadaClient } from '../omadaClient/index.js';
import { siteInputSchema, toToolResult, wrapToolHandler } from '../server/common.js';

const inputSchema = siteInputSchema.extend({
    allPortal: z.boolean().describe('true for SSIDs and networks of every portal.'),
    portalIds: z.array(z.string().trim().min(1)).optional().describe('Portal IDs, when allPortal is false.'),
});

type Client = Pick<OmadaClient, 'getPortalCandidates'>;

export function registerGetPortalCandidatesTool(server: McpServer, client: Client): void {
    server.registerTool(
        'getPortalCandidates',
        {
            description: 'List the SSIDs and networks served by captive portals, for choosing what to print on vouchers.',
            inputSchema: inputSchema.shape,
        },
        wrapToolHandler('getPortalCandidates', async ({ allPortal, portalIds, siteId, customHeaders }) =>
            toToolResult(await client.getPortalCandidates({ allPortal, ...(portalIds ? { portalIds } : {}) }, siteId, customHeaders))
        )
    );
}
