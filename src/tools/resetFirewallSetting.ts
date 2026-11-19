import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import type { OmadaClient } from '../omadaClient/index.js';
import { siteInputSchema, wrapMutationToolHandler } from '../server/common.js';
import { dryRunSchema, mutationSummary, runAction } from './resourceMutationShared.js';

const inputSchema = siteInputSchema.extend({
    dryRun: dryRunSchema,
});

type Client = Pick<OmadaClient, 'getFirewallSetting' | 'resetFirewallSetting'>;

export function registerResetFirewallSettingTool(server: McpServer, client: Client): void {
    server.registerTool(
        'resetFirewallSetting',
        {
            description:
                'Reset the firewall timeouts and flags of a site to the controller defaults. The controller exposes no reliable list of the defaults, so the result is the setting read after the reset, not a verified match. Defaults to a preview of the current setting; set dryRun:false to reset.',
            inputSchema: inputSchema.shape,
            annotations: { destructiveHint: true },
        },
        wrapMutationToolHandler<typeof inputSchema.shape>(
            'resetFirewallSetting',
            mutationSummary('reset-firewall', () => 'site'),
            async ({ siteId, customHeaders, dryRun }) => {
                const result = await runAction({
                    label: 'firewall reset',
                    dryRun,
                    preflight: async () => ({ current: await client.getFirewallSetting(siteId, customHeaders) }),
                    write: () => client.resetFirewallSetting(siteId, customHeaders),
                    warnings: ['Every firewall timeout and flag returns to its default.'],
                });
                return dryRun ? result : { ...result, after: await client.getFirewallSetting(siteId, customHeaders) };
            }
        )
    );
}
