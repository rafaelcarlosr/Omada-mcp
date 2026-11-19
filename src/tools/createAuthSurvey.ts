import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import { authSurveyPayloadSchema } from '../omadaClient/hotspotAdmin.js';
import type { OmadaClient } from '../omadaClient/index.js';
import { siteInputSchema, wrapMutationToolHandler } from '../server/common.js';
import { surveyRecord } from './hotspotShared.js';
import { dryRunSchema, mutationSummary, runCreate } from './resourceMutationShared.js';

const inputSchema = siteInputSchema.extend({
    payload: authSurveyPayloadSchema.describe(
        'Survey (official CreateFormAuthOpenApiVO): title shown to users, name shown in the controller, note, authTimeout { authTimeout 0 custom with customTimeout and customTimeoutUnit (1 min, 2 h, 3 days), 1 30 min, 2 1 h, 3 2 h, 4 4 h, 5 8 h, 6 1 day, 7 7 days }, cardList of questions { type 0 single, 1 multiple, 2 drop-down, 3 input, 4 score, 5 prompt; required; title; choices } and published.'
    ),
    dryRun: dryRunSchema,
});

type Client = Pick<OmadaClient, 'createAuthSurvey' | 'listAuthSurveys'>;

export function registerCreateAuthSurveyTool(server: McpServer, client: Client): void {
    server.registerTool(
        'createAuthSurvey',
        {
            description:
                'Create an authentication survey (form authentication) that portal users answer before getting access. Defaults to a preview; set dryRun:false to create once and verify by readback.',
            inputSchema: inputSchema.shape,
            annotations: { destructiveHint: true },
        },
        wrapMutationToolHandler<typeof inputSchema.shape>(
            'createAuthSurvey',
            mutationSummary('create-auth-survey', (args) => String((args.payload as { name?: unknown }).name)),
            async ({ payload, siteId, customHeaders, dryRun }) =>
                await runCreate({
                    spec: {
                        label: 'authentication survey',
                        list: () => client.listAuthSurveys(siteId, customHeaders),
                        normalize: surveyRecord,
                    },
                    payload,
                    dryRun,
                    write: () => client.createAuthSurvey(payload, siteId, customHeaders),
                })
        )
    );
}
