import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import type { OmadaClient } from '../omadaClient/index.js';
import { siteInputSchema, wrapMutationToolHandler } from '../server/common.js';
import { surveyRecord } from './hotspotShared.js';
import { dryRunSchema, mutationSummary, runDelete } from './resourceMutationShared.js';

const inputSchema = siteInputSchema.extend({
    surveyId: z.string().trim().min(1).describe('Survey ID from listAuthSurveys.'),
    dryRun: dryRunSchema,
});

type Client = Pick<OmadaClient, 'deleteAuthSurvey' | 'listAuthSurveys'>;

export function registerDeleteAuthSurveyTool(server: McpServer, client: Client): void {
    server.registerTool(
        'deleteAuthSurvey',
        {
            description: 'Delete an authentication survey and its answers. Defaults to a preview; set dryRun:false to delete and verify it is gone.',
            inputSchema: inputSchema.shape,
            annotations: { destructiveHint: true },
        },
        wrapMutationToolHandler<typeof inputSchema.shape>(
            'deleteAuthSurvey',
            mutationSummary('delete-auth-survey', (args) => String(args.surveyId)),
            async ({ surveyId, siteId, customHeaders, dryRun }) =>
                await runDelete({
                    spec: {
                        label: 'authentication survey',
                        list: () => client.listAuthSurveys(siteId, customHeaders),
                        normalize: surveyRecord,
                    },
                    id: surveyId,
                    dryRun,
                    write: () => client.deleteAuthSurvey(surveyId, siteId, customHeaders),
                    warnings: ['The answers submitted to the survey are deleted too.'],
                })
        )
    );
}
