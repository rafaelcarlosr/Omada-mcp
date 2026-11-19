import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import type { OmadaClient } from '../omadaClient/index.js';
import { siteInputSchema, toToolResult, wrapToolHandler } from '../server/common.js';

const inputSchema = siteInputSchema.extend({
    portalId: z.string().trim().min(1).describe('Portal ID from getPortalProfile.'),
});

type Client = Pick<OmadaClient, 'getPortalCustomization'>;

export function registerGetPortalCustomizationTool(server: McpServer, client: Client): void {
    server.registerTool(
        'getPortalCustomization',
        {
            description: 'Get the page customization of one portal (colors, texts, logo and background).',
            inputSchema: inputSchema.shape,
        },
        wrapToolHandler('getPortalCustomization', async ({ portalId, siteId, customHeaders }) =>
            toToolResult(await client.getPortalCustomization(portalId, siteId, customHeaders))
        )
    );
}
