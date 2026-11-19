import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import { remoteLoggingPayloadSchema } from '../omadaClient/controllerSettings.js';
import type { OmadaClient } from '../omadaClient/index.js';
import { wrapMutationToolHandler } from '../server/common.js';
import { dryRunSchema, mutationSummary, runSettings } from './resourceMutationShared.js';
import { controllerInputSchema } from './siteAdminShared.js';

const inputSchema = controllerInputSchema.extend({
    payload: remoteLoggingPayloadSchema.describe('Remote logging (official Remote Log): enable, host (required with enable:true) and port 1-65535.'),
    dryRun: dryRunSchema,
});

type Client = Pick<OmadaClient, 'getRemoteLogging' | 'setRemoteLogging'>;

export function registerSetRemoteLoggingTool(server: McpServer, client: Client): void {
    server.registerTool(
        'setRemoteLogging',
        {
            description:
                'Send controller logs to a remote syslog server, or stop. Defaults to a preview of the current setting and differences; set dryRun:false to apply once and verify by readback.',
            inputSchema: inputSchema.shape,
            annotations: { destructiveHint: true },
        },
        wrapMutationToolHandler<typeof inputSchema.shape>(
            'setRemoteLogging',
            mutationSummary('set-remote-logging', () => 'controller'),
            async ({ payload, customHeaders, dryRun }) =>
                await runSettings({
                    label: 'remote logging',
                    read: () => client.getRemoteLogging(customHeaders),
                    payload,
                    dryRun,
                    write: () => client.setRemoteLogging(payload, customHeaders),
                    warnings: ['Controller logs, which can include client and user names, are sent to that server.'],
                })
        )
    );
}
