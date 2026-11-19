import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { OmadaClient } from '../omadaClient/index.js';
import { clientRecognitionEnableOpenApiVO21Schema } from '../omadaClient/requestSchemas.js';
import { wrapMutationToolHandler } from '../server/common.js';
import { dryRunSchema, mutationSummary, runSettings } from './resourceMutationShared.js';
import { controllerInputSchema } from './siteAdminShared.js';

const inputSchema = controllerInputSchema.extend({
    payload: clientRecognitionEnableOpenApiVO21Schema.describe('Client recognition (official ClientRecognitionEnableOpenApiVO): enable.'),
    dryRun: dryRunSchema,
});

type Client = Pick<OmadaClient, 'getClientRecognition' | 'setClientRecognition'>;

export function registerSetClientRecognitionTool(server: McpServer, client: Client): void {
    server.registerTool(
        'setClientRecognition',
        {
            description:
                'Turn client recognition (device type and vendor detection) on or off. Defaults to a preview of the current setting and differences; set dryRun:false to apply once and verify by readback.',
            inputSchema: inputSchema.shape,
            annotations: { destructiveHint: true },
        },
        wrapMutationToolHandler<typeof inputSchema.shape>(
            'setClientRecognition',
            mutationSummary('set-client-recognition', () => 'controller'),
            async ({ payload, customHeaders, dryRun }) =>
                await runSettings({
                    label: 'client recognition',
                    read: () => client.getClientRecognition(customHeaders),
                    payload,
                    dryRun,
                    write: () => client.setClientRecognition(payload, customHeaders),
                })
        )
    );
}
