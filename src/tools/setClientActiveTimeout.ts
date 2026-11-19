import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { OmadaClient } from '../omadaClient/index.js';
import { clientActiveTimeout21Schema } from '../omadaClient/requestSchemas.js';
import { wrapMutationToolHandler } from '../server/common.js';
import { dryRunSchema, mutationSummary, runSettings } from './resourceMutationShared.js';
import { controllerInputSchema } from './siteAdminShared.js';

const inputSchema = controllerInputSchema.extend({
    payload: clientActiveTimeout21Schema.describe('Client active timeout (official Client Active Timeout): clientActiveTimeoutMin, 3-10.'),
    dryRun: dryRunSchema,
});

type Client = Pick<OmadaClient, 'getClientActiveTimeout' | 'setClientActiveTimeout'>;

export function registerSetClientActiveTimeoutTool(server: McpServer, client: Client): void {
    server.registerTool(
        'setClientActiveTimeout',
        {
            description:
                'Set how many minutes (3-10) without traffic before the controller marks a client inactive. Defaults to a preview of the current setting and differences; set dryRun:false to apply once and verify by readback.',
            inputSchema: inputSchema.shape,
            annotations: { destructiveHint: true },
        },
        wrapMutationToolHandler<typeof inputSchema.shape>(
            'setClientActiveTimeout',
            mutationSummary('set-client-active-timeout', () => 'controller'),
            async ({ payload, customHeaders, dryRun }) =>
                await runSettings({
                    label: 'client active timeout',
                    read: () => client.getClientActiveTimeout(customHeaders),
                    payload,
                    dryRun,
                    write: () => client.setClientActiveTimeout(payload, customHeaders),
                })
        )
    );
}
