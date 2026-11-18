import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import type { OmadaClient } from '../omadaClient/index.js';
import { deviceMacSchema, siteInputSchema, wrapMutationToolHandler } from '../server/common.js';
import { dryRunSchema, mutationSummary, runAction } from './resourceMutationShared.js';

const inputSchema = siteInputSchema.extend({
    switchMac: deviceMacSchema.describe('MAC address of the switch running a cable test.'),
    dryRun: dryRunSchema,
});

type Client = Pick<OmadaClient, 'cancelSwitchCableTest' | 'getCableTestFullResults'>;

export function registerCancelSwitchCableTestTool(server: McpServer, client: Client): void {
    server.registerTool(
        'cancelSwitchCableTest',
        {
            description: 'Cancel a running cable test on a switch. Defaults to a preview of the current test state; set dryRun:false to send.',
            inputSchema: inputSchema.shape,
            annotations: { destructiveHint: true },
        },
        wrapMutationToolHandler<typeof inputSchema.shape>(
            'cancelSwitchCableTest',
            mutationSummary('cancel-switch-cable-test', (args) => String(args.switchMac)),
            async ({ switchMac, siteId, customHeaders, dryRun }) =>
                await runAction({
                    label: 'cable test cancellation',
                    dryRun,
                    preflight: async () => ({ switchMac, current: await client.getCableTestFullResults(switchMac, siteId, customHeaders) }),
                    write: () => client.cancelSwitchCableTest(switchMac, siteId, customHeaders),
                })
        )
    );
}
