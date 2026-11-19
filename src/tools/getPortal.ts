import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import type { OmadaClient } from '../omadaClient/index.js';
import { siteInputSchema, toToolResult, wrapToolHandler } from '../server/common.js';

const inputSchema = siteInputSchema.extend({
    portalId: z.string().trim().min(1).describe('Portal ID from getPortalProfile.'),
});

type Client = Pick<OmadaClient, 'getPortal'>;

export function registerGetPortalTool(server: McpServer, client: Client): void {
    server.registerTool(
        'getPortal',
        {
            description: 'Get one portal: authentication type, timeouts, landing page, SSIDs and networks. Secrets are redacted.',
            inputSchema: inputSchema.shape,
        },
        wrapToolHandler('getPortal', async ({ portalId, siteId, customHeaders }) =>
            toToolResult(await client.getPortal(portalId, siteId, customHeaders))
        )
    );
}
