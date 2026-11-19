import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import type { OmadaClient } from '../omadaClient/index.js';
import { siteInputSchema, wrapMutationToolHandler } from '../server/common.js';
import { dryRunSchema, mutationSummary, runBatchDelete, toRecords } from './resourceMutationShared.js';

const inputSchema = siteInputSchema.extend({
    surveyId: z.string().trim().min(1).describe('Survey ID from listAuthSurveys.'),
    resultIds: z.array(z.string().trim().min(1)).min(1).max(1000).describe('Answer IDs from listSurveyResults.'),
    dryRun: dryRunSchema,
});

type Client = Pick<OmadaClient, 'deleteSurveyResults' | 'listSurveyResults'>;

export function registerDeleteSurveyResultsTool(server: McpServer, client: Client): void {
    server.registerTool(
        'deleteSurveyResults',
        {
            description:
                'Delete selected answers of an authentication survey. Only the listed IDs are deleted. Defaults to a preview; set dryRun:false to delete and verify they are gone.',
            inputSchema: inputSchema.shape,
            annotations: { destructiveHint: true },
        },
        wrapMutationToolHandler<typeof inputSchema.shape>(
            'deleteSurveyResults',
            mutationSummary('delete-survey-results', (args) => String(args.surveyId)),
            async ({ surveyId, resultIds, siteId, customHeaders, dryRun }) =>
                await runBatchDelete({
                    spec: {
                        label: 'survey answer',
                        list: async () =>
                            toRecords(((await client.listSurveyResults(surveyId, 1, 1000, siteId, customHeaders)) as { data?: unknown })?.data ?? []),
                        nameKey: null,
                    },
                    ids: resultIds,
                    dryRun,
                    write: () => client.deleteSurveyResults(surveyId, resultIds, siteId, customHeaders),
                })
        )
    );
}
