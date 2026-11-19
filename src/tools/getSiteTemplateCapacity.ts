import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import type { OmadaClient } from '../omadaClient/index.js';
import { toToolResult, wrapToolHandler } from '../server/common.js';
import { controllerInputSchema } from './siteAdminShared.js';

const inputSchema = controllerInputSchema.extend({
    siteTemplateId: z.string().trim().min(1).describe('Site template ID from getSiteTemplateList.'),
});

type Client = Pick<OmadaClient, 'getSiteTemplateCapacity'>;

export function registerGetSiteTemplateCapacityTool(server: McpServer, client: Client): void {
    server.registerTool(
        'getSiteTemplateCapacity',
        {
            description: 'Get the capacity limits of a site template.',
            inputSchema: inputSchema.shape,
        },
        wrapToolHandler('getSiteTemplateCapacity', async ({ siteTemplateId, customHeaders }) =>
            toToolResult(await client.getSiteTemplateCapacity(siteTemplateId, customHeaders))
        )
    );
}
