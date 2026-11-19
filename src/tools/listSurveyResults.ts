import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import type { OmadaClient } from '../omadaClient/index.js';
import { siteInputSchema, toToolResult, wrapToolHandler } from '../server/common.js';
import { createPaginationSchema } from '../utils/pagination-schema.js';

const inputSchema = siteInputSchema.extend({
    surveyId: z.string().trim().min(1).describe('Survey ID from listAuthSurveys.'),
    ...createPaginationSchema(),
});

type Client = Pick<OmadaClient, 'listSurveyResults'>;

export function registerListSurveyResultsTool(server: McpServer, client: Client): void {
    server.registerTool(
        'listSurveyResults',
        {
            description: 'List the answers submitted to an authentication survey (paginated).',
            inputSchema: inputSchema.shape,
        },
        wrapToolHandler('listSurveyResults', async ({ surveyId, page, pageSize, siteId, customHeaders }) =>
            toToolResult(await client.listSurveyResults(surveyId, page ?? 1, pageSize ?? 10, siteId, customHeaders))
        )
    );
}
