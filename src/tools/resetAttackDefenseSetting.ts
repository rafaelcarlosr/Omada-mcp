import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import type { OmadaClient } from '../omadaClient/index.js';
import { siteInputSchema, wrapMutationToolHandler } from '../server/common.js';
import { dryRunSchema, mutationSummary, type RecordLike, runSettings } from './resourceMutationShared.js';

const inputSchema = siteInputSchema.extend({
    dryRun: dryRunSchema,
});

type Client = Pick<OmadaClient, 'getAttackDefenseDefaults' | 'getAttackDefenseSetting' | 'resetAttackDefenseSetting'>;

export function registerResetAttackDefenseSettingTool(server: McpServer, client: Client): void {
    server.registerTool(
        'resetAttackDefenseSetting',
        {
            description:
                'Reset the attack and defense setting of a site to the controller defaults. Defaults to a preview of the differences; set dryRun:false to reset and verify against the defaults.',
            inputSchema: inputSchema.shape,
            annotations: { destructiveHint: true },
        },
        wrapMutationToolHandler<typeof inputSchema.shape>(
            'resetAttackDefenseSetting',
            mutationSummary('reset-attack-defense', () => 'site'),
            async ({ siteId, customHeaders, dryRun }) => {
                const defaults = ((await client.getAttackDefenseDefaults(siteId, customHeaders)) ?? {}) as RecordLike;
                if (Object.keys(defaults).length === 0)
                    throw new Error('The controller returned no attack and defense defaults. No request was sent.');
                return await runSettings({
                    label: 'attack and defense',
                    read: async () => ((await client.getAttackDefenseSetting(siteId, customHeaders)) ?? {}) as RecordLike,
                    payload: defaults,
                    dryRun,
                    write: () => client.resetAttackDefenseSetting(siteId, customHeaders),
                    warnings: ['Every flood and scan protection returns to its default.'],
                });
            }
        )
    );
}
