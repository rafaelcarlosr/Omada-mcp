import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import { authSurveyPayloadSchema } from '../omadaClient/hotspotAdmin.js';
import type { OmadaClient } from '../omadaClient/index.js';
import { siteInputSchema, wrapMutationToolHandler } from '../server/common.js';
import { surveyRecord } from './hotspotShared.js';
import { dryRunSchema, mutationSummary, runUpdate } from './resourceMutationShared.js';

const inputSchema = siteInputSchema.extend({
    surveyId: z.string().trim().min(1).describe('Survey ID from listAuthSurveys.'),
    payload: authSurveyPayloadSchema.describe('Complete survey (official CreateFormAuthOpenApiVO).'),
    dryRun: dryRunSchema,
});

type Client = Pick<OmadaClient, 'listAuthSurveys' | 'updateAuthSurvey'>;

export function registerUpdateAuthSurveyTool(server: McpServer, client: Client): void {
    server.registerTool(
        'updateAuthSurvey',
        {
            description:
                'Replace an authentication survey: texts, validity, questions and whether it is published. Defaults to a preview; set dryRun:false to apply once and verify by readback.',
            inputSchema: inputSchema.shape,
            annotations: { destructiveHint: true },
        },
        wrapMutationToolHandler<typeof inputSchema.shape>(
            'updateAuthSurvey',
            mutationSummary('update-auth-survey', (args) => String(args.surveyId)),
            async ({ surveyId, payload, siteId, customHeaders, dryRun }) =>
                await runUpdate({
                    spec: {
                        label: 'authentication survey',
                        list: () => client.listAuthSurveys(siteId, customHeaders),
                        normalize: surveyRecord,
                    },
                    id: surveyId,
                    payload,
                    dryRun,
                    write: () => client.updateAuthSurvey(surveyId, payload, siteId, customHeaders),
                })
        )
    );
}
