import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { OmadaClient } from '../omadaClient/index.js';
import { experienceImprovementProgram21Schema } from '../omadaClient/requestSchemas.js';
import { wrapMutationToolHandler } from '../server/common.js';
import { dryRunSchema, mutationSummary, runSettings } from './resourceMutationShared.js';
import { controllerInputSchema } from './siteAdminShared.js';

const inputSchema = controllerInputSchema.extend({
    payload: experienceImprovementProgram21Schema.describe('Experience improvement (official Experience Improvement Program): expImprove.'),
    dryRun: dryRunSchema,
});

type Client = Pick<OmadaClient, 'getExperienceImprovement' | 'setExperienceImprovement'>;

export function registerSetExperienceImprovementTool(server: McpServer, client: Client): void {
    server.registerTool(
        'setExperienceImprovement',
        {
            description:
                'Join or leave the TP-Link user experience improvement program. Defaults to a preview of the current setting and differences; set dryRun:false to apply once and verify by readback.',
            inputSchema: inputSchema.shape,
            annotations: { destructiveHint: true },
        },
        wrapMutationToolHandler<typeof inputSchema.shape>(
            'setExperienceImprovement',
            mutationSummary('set-experience-improvement', () => 'controller'),
            async ({ payload, customHeaders, dryRun }) =>
                await runSettings({
                    label: 'experience improvement',
                    read: () => client.getExperienceImprovement(customHeaders),
                    payload,
                    dryRun,
                    write: () => client.setExperienceImprovement(payload, customHeaders),
                    warnings: ['Joining sends anonymous usage data to TP-Link.'],
                })
        )
    );
}
