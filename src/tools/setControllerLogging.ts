import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import { controllerLoggingPayloadSchema } from '../omadaClient/controllerSettings.js';
import type { OmadaClient } from '../omadaClient/index.js';
import { wrapMutationToolHandler } from '../server/common.js';
import { dryRunSchema, mutationSummary, runSettings } from './resourceMutationShared.js';
import { controllerInputSchema } from './siteAdminShared.js';

const inputSchema = controllerInputSchema.extend({
    payload: controllerLoggingPayloadSchema.describe(
        'Log level (official Log Level): type AUTO, or CUSTOM with otherModule, managerModule, clientModule, monitorModule, systemModule, accountModule and logModule.'
    ),
    dryRun: dryRunSchema,
});

type Client = Pick<OmadaClient, 'getLogging' | 'setControllerLogging'>;

export function registerSetControllerLoggingTool(server: McpServer, client: Client): void {
    server.registerTool(
        'setControllerLogging',
        {
            description:
                'Set the controller log level: AUTO, or CUSTOM with WARN, INFO or DEBUG per module. Defaults to a preview of the current setting and differences; set dryRun:false to apply once and verify by readback.',
            inputSchema: inputSchema.shape,
            annotations: { destructiveHint: true },
        },
        wrapMutationToolHandler<typeof inputSchema.shape>(
            'setControllerLogging',
            mutationSummary('set-controller-logging', () => 'controller'),
            async ({ payload, customHeaders, dryRun }) =>
                await runSettings({
                    label: 'controller logging',
                    read: () => client.getLogging(customHeaders),
                    payload,
                    dryRun,
                    write: () => client.setControllerLogging(payload, customHeaders),
                    warnings: ['DEBUG levels make the controller log grow quickly.'],
                })
        )
    );
}
