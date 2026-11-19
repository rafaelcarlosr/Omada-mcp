import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import type { OmadaClient } from '../omadaClient/index.js';
import { toToolResult, wrapToolHandler } from '../server/common.js';
import { controllerInputSchema } from './siteAdminShared.js';

const inputSchema = controllerInputSchema.extend({
    siteTemplateId: z.string().trim().min(1).describe('Site template ID from getSiteTemplateList.'),
});

type Client = Pick<OmadaClient, 'getSiteTemplateSpecification'>;

export function registerGetSiteTemplateSpecificationTool(server: McpServer, client: Client): void {
    server.registerTool(
        'getSiteTemplateSpecification',
        {
            description: 'Get which features a site template supports.',
            inputSchema: inputSchema.shape,
        },
        wrapToolHandler('getSiteTemplateSpecification', async ({ siteTemplateId, customHeaders }) =>
            toToolResult(await client.getSiteTemplateSpecification(siteTemplateId, customHeaders))
        )
    );
}
