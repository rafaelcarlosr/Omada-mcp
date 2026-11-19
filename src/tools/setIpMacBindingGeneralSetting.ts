import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import type { OmadaClient } from '../omadaClient/index.js';
import { iPMacBindingGeneralSettingSchema } from '../omadaClient/requestSchemas.js';
import { siteInputSchema, wrapMutationToolHandler } from '../server/common.js';
import { dryRunSchema, mutationSummary, type RecordLike, runSettings } from './resourceMutationShared.js';

const inputSchema = siteInputSchema.extend({
    changes: iPMacBindingGeneralSettingSchema
        .partial()
        .refine((value) => Object.keys(value).length > 0, 'At least one change is required.')
        .describe('Fields to change: enable, lanIds and/or wanIds (at least one while enabled), imbPass, garp and interval (1-10000).'),
    dryRun: dryRunSchema,
});

type Client = Pick<OmadaClient, 'getIpMacBindingGeneralSetting' | 'setIpMacBindingGeneralSetting'>;

export function registerSetIpMacBindingGeneralSettingTool(server: McpServer, client: Client): void {
    server.registerTool(
        'setIpMacBindingGeneralSetting',
        {
            description:
                'Turn IP-MAC binding enforcement on or off and choose the LANs and WANs it applies to. Enforcing it drops traffic from devices whose IP and MAC do not match a binding. Unlisted fields keep their current values. Defaults to a preview; set dryRun:false to apply once and verify by readback.',
            inputSchema: inputSchema.shape,
            annotations: { destructiveHint: true },
        },
        wrapMutationToolHandler<typeof inputSchema.shape>(
            'setIpMacBindingGeneralSetting',
            mutationSummary('set-ip-mac-binding-general', () => 'site'),
            async ({ changes, siteId, customHeaders, dryRun }) => {
                const read = async (): Promise<RecordLike> =>
                    ((await client.getIpMacBindingGeneralSetting(siteId, customHeaders)) ?? {}) as RecordLike;
                const merged = { ...(await read()), ...changes };
                const scoped = (value: unknown): boolean => Array.isArray(value) && value.length > 0;
                if (merged.enable === true && !scoped(merged.lanIds) && !scoped(merged.wanIds)) {
                    throw new Error('Enabling IP-MAC binding needs lanIds or wanIds. No request was sent.');
                }
                const payload = iPMacBindingGeneralSettingSchema.parse(
                    Object.fromEntries(
                        Object.entries(merged).filter(([key]) => ['enable', 'lanIds', 'wanIds', 'imbPass', 'garp', 'interval'].includes(key))
                    )
                );
                return await runSettings({
                    label: 'IP-MAC binding',
                    read,
                    payload: (payload.enable ? payload : { enable: false }) as RecordLike,
                    dryRun,
                    write: () => client.setIpMacBindingGeneralSetting(payload, siteId, customHeaders),
                    ...(payload.enable
                        ? { warnings: ['Traffic from devices whose IP and MAC do not match a binding is dropped on the selected interfaces.'] }
                        : {}),
                });
            }
        )
    );
}
