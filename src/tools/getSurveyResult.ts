import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import type { OmadaClient } from '../omadaClient/index.js';
import { siteInputSchema, toToolResult, wrapToolHandler } from '../server/common.js';

const inputSchema = siteInputSchema.extend({
    resultId: z.string().trim().min(1).describe('Survey result ID from listSurveyResults.'),
});

type Client = Pick<OmadaClient, 'getSurveyResult'>;

export function registerGetSurveyResultTool(server: McpServer, client: Client): void {
    server.registerTool(
        'getSurveyResult',
        {
            description: 'Get one submitted survey answer.',
            inputSchema: inputSchema.shape,
        },
        wrapToolHandler('getSurveyResult', async ({ resultId, siteId, customHeaders }) =>
            toToolResult(await client.getSurveyResult(resultId, siteId, customHeaders))
        )
    );
}
