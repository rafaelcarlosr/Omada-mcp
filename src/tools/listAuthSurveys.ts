import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import type { OmadaClient } from '../omadaClient/index.js';
import { siteInputSchema, toToolResult, wrapToolHandler } from '../server/common.js';

type Client = Pick<OmadaClient, 'listAuthSurveys'>;

export function registerListAuthSurveysTool(server: McpServer, client: Client): void {
    server.registerTool(
        'listAuthSurveys',
        {
            description: 'List the authentication surveys (form authentication) of the site with their questions and answer counts.',
            inputSchema: siteInputSchema.shape,
        },
        wrapToolHandler('listAuthSurveys', async ({ siteId, customHeaders }) => toToolResult(await client.listAuthSurveys(siteId, customHeaders)))
    );
}
