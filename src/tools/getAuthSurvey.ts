import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import type { OmadaClient } from '../omadaClient/index.js';
import { siteInputSchema, toToolResult, wrapToolHandler } from '../server/common.js';

const inputSchema = siteInputSchema.extend({
    surveyId: z.string().trim().min(1).describe('Survey ID from listAuthSurveys.'),
});

type Client = Pick<OmadaClient, 'getAuthSurvey'>;

export function registerGetAuthSurveyTool(server: McpServer, client: Client): void {
    server.registerTool(
        'getAuthSurvey',
        {
            description: 'Get one authentication survey with its questions.',
            inputSchema: inputSchema.shape,
        },
        wrapToolHandler('getAuthSurvey', async ({ surveyId, siteId, customHeaders }) =>
            toToolResult(await client.getAuthSurvey(surveyId, siteId, customHeaders))
        )
    );
}
